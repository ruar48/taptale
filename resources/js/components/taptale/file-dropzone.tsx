import { FileText, ImagePlus, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { formatFileSize } from '@/lib/money';
import { cn } from '@/lib/utils';

/**
 * Mobile-friendly multi-file picker with thumbnails. Works with camera
 * rolls on phones (tap to open the picker) and drag & drop on desktop.
 */
export function FileDropzone({
    files,
    onChange,
    maxFiles,
    maxKilobytes,
    accept = 'image/jpeg,image/png,image/webp',
    label = 'Add photos',
    hint,
    error,
    id,
}: {
    files: File[];
    onChange: (files: File[]) => void;
    maxFiles: number;
    maxKilobytes: number;
    accept?: string;
    label?: string;
    hint?: string;
    error?: string;
    id?: string;
}) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);

    const previews = useMemo(
        () =>
            files.map((file) => ({
                file,
                url: file.type.startsWith('image/')
                    ? URL.createObjectURL(file)
                    : null,
            })),
        [files],
    );

    useEffect(
        () => () => {
            previews.forEach(
                (preview) => preview.url && URL.revokeObjectURL(preview.url),
            );
        },
        [previews],
    );

    const addFiles = (incoming: FileList | null) => {
        if (!incoming) {
            return;
        }

        const tooLarge = Array.from(incoming).filter(
            (file) => file.size > maxKilobytes * 1024,
        );
        const accepted = Array.from(incoming).filter(
            (file) => file.size <= maxKilobytes * 1024,
        );
        const next = [...files, ...accepted].slice(0, maxFiles);

        setLocalError(
            tooLarge.length > 0
                ? `${tooLarge.length === 1 ? 'One file is' : `${tooLarge.length} files are`} larger than ${Math.round(maxKilobytes / 1024)} MB.`
                : files.length + accepted.length > maxFiles
                  ? `You can add up to ${maxFiles} ${maxFiles === 1 ? 'file' : 'files'}.`
                  : null,
        );

        onChange(next);

        if (inputRef.current) {
            inputRef.current.value = '';
        }
    };

    const remaining = maxFiles - files.length;

    return (
        <div className="space-y-3">
            {remaining > 0 && (
                <label
                    htmlFor={id}
                    onDragOver={(event) => {
                        event.preventDefault();
                        setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(event) => {
                        event.preventDefault();
                        setIsDragging(false);
                        addFiles(event.dataTransfer.files);
                    }}
                    className={cn(
                        'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-7 text-center transition-colors',
                        isDragging
                            ? 'border-rose bg-blush-light/60'
                            : 'border-border bg-card hover:border-rose/60 hover:bg-blush-light/30',
                        error && 'border-destructive/60',
                    )}
                >
                    <span className="flex size-12 items-center justify-center rounded-full bg-blush-light text-plum dark:bg-rose/20 dark:text-blush">
                        <ImagePlus className="size-6" />
                    </span>
                    <span className="font-medium">{label}</span>
                    <span className="text-xs text-muted-foreground">
                        {hint ??
                            `Tap to choose from your phone or drag files here · up to ${remaining} more · max ${Math.round(maxKilobytes / 1024)} MB each`}
                    </span>
                    <input
                        ref={inputRef}
                        id={id}
                        type="file"
                        multiple={maxFiles > 1}
                        accept={accept}
                        className="sr-only"
                        onChange={(event) => addFiles(event.target.files)}
                    />
                </label>
            )}

            {previews.length > 0 && (
                <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                    {previews.map(({ file, url }, index) => (
                        <li
                            key={`${file.name}-${index}`}
                            className="group relative aspect-square overflow-hidden rounded-xl border bg-muted"
                        >
                            {url ? (
                                <img
                                    src={url}
                                    alt={file.name}
                                    className="size-full object-cover"
                                />
                            ) : (
                                <div className="flex size-full flex-col items-center justify-center gap-1 p-2 text-center">
                                    <FileText className="size-6 text-muted-foreground" />
                                    <span className="line-clamp-2 text-[10px] break-all text-muted-foreground">
                                        {file.name}
                                    </span>
                                </div>
                            )}
                            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-2 pt-4 pb-1 text-[10px] text-white">
                                {formatFileSize(file.size)}
                            </span>
                            <button
                                type="button"
                                onClick={() =>
                                    onChange(files.filter((_, i) => i !== index))
                                }
                                className="absolute top-1.5 right-1.5 flex size-7 items-center justify-center rounded-full bg-white/90 text-charcoal shadow transition hover:bg-white"
                                aria-label={`Remove ${file.name}`}
                            >
                                <X className="size-4" />
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            {(error || localError) && (
                <p className="text-sm text-destructive">{error ?? localError}</p>
            )}
        </div>
    );
}
