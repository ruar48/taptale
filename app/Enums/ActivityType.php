<?php

namespace App\Enums;

enum ActivityType: string
{
    case Placed = 'placed';
    case StatusChanged = 'status_changed';
    case Note = 'note';
    case PaymentSubmitted = 'payment_submitted';
    case PaymentVerified = 'payment_verified';
    case PaymentRejected = 'payment_rejected';
    case Refunded = 'refunded';
    case Adjusted = 'adjusted';
    case ProofSent = 'proof_sent';
    case RevisionRequested = 'revision_requested';
    case DesignApproved = 'design_approved';
    case DesignSubmitted = 'design_submitted';
    case FilesUploaded = 'files_uploaded';
    case Cancelled = 'cancelled';
    case ReviewSubmitted = 'review_submitted';
}
