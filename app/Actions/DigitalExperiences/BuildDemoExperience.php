<?php

namespace App\Actions\DigitalExperiences;

use App\Enums\ExperienceTemplate;
use App\Enums\FlowerRain;
use App\Enums\FlowerStyle;

/**
 * Sample content used to preview a memory page template before buying.
 * It has the same shape as DigitalExperienceResource; photos are left
 * empty so the page shows its soft placeholder frames.
 */
class BuildDemoExperience
{
    /**
     * Flower designs can start with a chosen look, so a link can open the
     * bouquet demo with, say, white flowers and raining photos.
     *
     * @return array<string, mixed>
     */
    public function handle(ExperienceTemplate $template, FlowerStyle $flowerStyle = FlowerStyle::Bouquet, FlowerRain $flowerRain = FlowerRain::None): array
    {
        $copy = $this->copy($template);
        $moments = [
            ['date' => 'February 14', 'title' => 'The first hello', 'caption' => 'You laughed at my terrible joke and I knew I was in trouble.'],
            ['date' => 'June 2', 'title' => 'Our first trip', 'caption' => 'We went to a major trip in Baguio! I love doing travels with you.'],
            ['date' => 'September 20', 'title' => 'Rainy day café', 'caption' => 'Two coffees, one umbrella and a thousand stories.'],
            ['date' => 'December 31', 'title' => 'New Year with you', 'caption' => 'Starting the year with you makes me feel complete.'],
            ['date' => 'March 8', 'title' => 'Just because', 'caption' => 'The ordinary days are my favorite when they are with you.'],
            ['date' => 'Today', 'title' => 'Still choosing you', 'caption' => 'And I will keep choosing you, every single day.'],
        ];

        return [
            'code' => 'demo-'.$template->value,
            'template' => $template->value,
            'theme' => $template->defaultTheme(),
            'title' => $copy['title'],
            'subtitle' => $copy['subtitle'],
            'recipient_name' => $copy['recipient'],
            'sender_name' => $copy['sender'],
            'message' => $copy['message'],
            'quote' => $copy['quote'],
            'flowers_note' => $template === ExperienceTemplate::DigitalBouquet
                ? 'Real flowers wilt, but these will bloom for you every time you open this.'
                : 'These white tulips make me think of your genuine soul.',
            'flower_style' => $flowerStyle->value,
            'flower_rain' => $flowerRain->value,
            'flower_addon' => false,
            'photo_rain_layer' => 'front',
            'event_date' => $copy['date'],
            'video_url' => null,
            'video_file_url' => null,
            'video_frame' => 'plain',
            'video_background' => 'theme',
            'music_url' => 'https://www.youtube.com/watch?v=iKzRIweSBLA',
            'song_title' => 'Perfect',
            'song_artist' => 'Ed Sheeran',
            'song_ornament' => 'none',
            'song_background' => 'theme',
            'song_details' => null,
            'audio_url' => null,
            'photos' => [],
            'rain_photos' => [],
            'moments' => array_map(fn (array $moment): array => [...$moment, 'photo' => null, 'photo_url' => null], $moments),
            'custom_sections' => [],
            'nfc_tag_uid' => null,
            'is_published' => true,
            'unlocks_at' => null,
            'view_count' => 0,
            'heart_count' => 0,
            'public_url' => route('experiences.demo', $template->value),
            'qr_url' => null,
            'tag_url' => null,
            'is_tag_check_active' => false,
        ];
    }

    /**
     * @return array{title: string, subtitle: string, recipient: string, sender: string, message: string, quote: string, date: string}
     */
    private function copy(ExperienceTemplate $template): array
    {
        $letter = "Hi love,\n\nIt's kind of amazing how fast time has passed. It doesn't feel that long, but we've already shared so many memories together. From the random conversations to the small moments that might seem simple to others, they all mean a lot to me because I experienced them with you.\n\nThank you for being patient with me, for understanding me, and for staying by my side through everything. I'm really grateful to have you in my life.";

        return match ($template) {
            ExperienceTemplate::Monthsary => ['title' => 'Happy 6th Monthsary', 'subtitle' => 'My Love!', 'recipient' => 'my love', 'sender' => 'yours always', 'message' => $letter, 'quote' => 'We are together in every situation.', 'date' => 'Our 6 months together'],
            ExperienceTemplate::Birthday => ['title' => 'Happy Birthday Love!', 'subtitle' => 'I love you!', 'recipient' => 'my birthday girl', 'sender' => 'me', 'message' => "Happy birthday to the person who makes every day feel like a celebration. I hope this year gives you everything you've been wishing for — and more reasons to smile.", 'quote' => 'Another year of you is the best gift.', 'date' => 'Today is all about you'],
            ExperienceTemplate::LoveStory => ['title' => 'How we happened', 'subtitle' => 'A little story about us', 'recipient' => 'my langga', 'sender' => 'us', 'message' => "You don't know how much I appreciate you. You're my everything. Thank you for being there in every situation.", 'quote' => 'We are together in every situation.', 'date' => 'Since 2024'],
            ExperienceTemplate::LittleSomething => ['title' => 'A little something for you', 'subtitle' => 'When secrets are meant to be known', 'recipient' => 'you', 'sender' => 'me', 'message' => $letter, 'quote' => 'Some gifts aren\'t expensive, just meaningful.', 'date' => 'Made with love'],
            ExperienceTemplate::DigitalBouquet => ['title' => 'Flowers for you', 'subtitle' => 'Ones that will never wilt', 'recipient' => 'my love', 'sender' => 'yours always', 'message' => $letter, 'quote' => 'I would pick you in every garden.', 'date' => 'Picked just for you'],
            ExperienceTemplate::GirlfriendsDay => ['title' => "Happy Girlfriend's Day", 'subtitle' => 'To the best girlfriend in the world', 'recipient' => 'my girl', 'sender' => 'your boyfriend', 'message' => $letter, 'quote' => 'You are my favorite hello and my hardest goodbye.', 'date' => 'August 1'],
            ExperienceTemplate::Valentines => ['title' => 'Hi my baby!', 'subtitle' => 'Would you like to see your gift?', 'recipient' => 'my valentine', 'sender' => 'your forever valentine', 'message' => $letter, 'quote' => 'I love you so much!', 'date' => 'February 14'],
            ExperienceTemplate::Apology => ['title' => "I'm sorry", 'subtitle' => 'Will you hear me out?', 'recipient' => 'you', 'sender' => 'me', 'message' => "I know I hurt you, and I'm truly sorry. You deserve patience and kindness, and I want to do better — not just say it. Here are a few of the moments that remind me why we're worth it.", 'quote' => 'Every storm runs out of rain.', 'date' => 'With all my heart'],
            ExperienceTemplate::OurSong => ['title' => 'This song reminds me of you', 'subtitle' => 'Press play', 'recipient' => 'you', 'sender' => 'me', 'message' => "Every time this song plays, I'm back in that moment with you.", 'quote' => 'You are my favorite song.', 'date' => 'On repeat since day one'],
            ExperienceTemplate::Anniversary => ['title' => 'Happy Anniversary', 'subtitle' => 'One more year of us', 'recipient' => 'my forever', 'sender' => 'your person', 'message' => $letter, 'quote' => 'Still you. Always you.', 'date' => 'Year one, of forever'],
            ExperienceTemplate::Wedding => ['title' => 'Ana & Leo', 'subtitle' => 'Forever starts today', 'recipient' => 'our family and friends', 'sender' => 'Ana & Leo', 'message' => 'Thank you for celebrating the beginning of our forever with us. Every smile, prayer and hug made our day complete.', 'quote' => 'Two souls, one heart.', 'date' => 'December 12, 2026'],
            ExperienceTemplate::SaveTheDate => ['title' => 'Save the Date', 'subtitle' => 'Ana & Leo are getting married', 'recipient' => 'you', 'sender' => 'Ana & Leo', 'message' => "We can't wait to celebrate with you! Formal invitation and details to follow.\n\nSt. Augustine Church, Intramuros, Manila", 'quote' => 'And so the adventure begins.', 'date' => 'December 12, 2026'],
            ExperienceTemplate::Bestie => ['title' => 'My favorite person', 'subtitle' => 'Bestie since forever', 'recipient' => 'bestie', 'sender' => 'your other half', 'message' => 'Thank you for the laughs, the late-night talks and for always being on my side. Here\'s to more chaos together.', 'quote' => 'Friends who feel like family.', 'date' => 'Best friends since 2015'],
            ExperienceTemplate::Family => ['title' => 'Welcome, little one', 'subtitle' => 'A blessing to our family', 'recipient' => 'our baby', 'sender' => 'Mommy & Daddy', 'message' => 'May you grow surrounded by love, faith and laughter. We thank everyone who celebrated this blessing with us.', 'quote' => 'Every good and perfect gift is from above.', 'date' => 'Baptized June 21, 2026'],
            ExperienceTemplate::Graduation => ['title' => 'Congratulations, Graduate!', 'subtitle' => 'Class of 2026', 'recipient' => 'our graduate', 'sender' => 'your proud family', 'message' => 'All the late nights and hard work led to this moment. We are so proud of you — the best is yet to come.', 'quote' => 'The tassel was worth the hassle.', 'date' => 'Class of 2026'],
            ExperienceTemplate::Classic => ['title' => 'Ana & Leo', 'subtitle' => 'Our story so far', 'recipient' => 'you', 'sender' => 'me', 'message' => 'Every tap brings me back to the day you said yes.', 'quote' => 'Every tap tells a story.', 'date' => 'Since 2019'],
        };
    }
}
