/* content-en.js — English content for foreign customers. Same order as que-data.js / brand.js, so the
 * same person (date + name + year) gets the same quẻ and stone in both languages.
 * Same DNA rules as the Vietnamese text: kind wishes, no predictions or promises ("will", "always"),
 * stone meanings only as belief ("Traditionally, X is believed to symbolize ..."), no "helps / brings /
 * attracts", no health, price, origin or "natural" claims. Brand names and the slogan stay Vietnamese.
 * Checked by tests/que-lint.test.js. Load after que-data.js and brand.js. ES5. */
(function (root) {
  'use strict';
  var FT = root.FT = root.FT || {};
  var VI = FT.QUE;

  var LIST = [
    ['New Beginnings', 'Fresh morning sun upon the stair,|Light steps ahead, a steady heart.', 'A fresh beginning is waiting for you.', 'Start on something you planned long ago, even with one small step.'],
    ['Peace of Mind', 'A gentle breeze along the porch,|A calm heart makes the world feel calm.', 'Wishing you a peaceful heart today, seeing things lightly.', 'Spend five minutes sitting still and breathing slowly before your day begins.'],
    ['Smooth Flow', 'The river flows on to the sea,|Each task can find its open way.', 'Wishing your work today goes smoothly.', 'List your three most important tasks and do them one by one.'],
    ['Kindness', 'Sow kind words throughout the day,|Good words and thoughts gather around.', 'A kind heart is a beautiful gift you give.', 'Say a sincere thank-you to someone near you.'],
    ['Togetherness', 'One tree alone is not a hill,|Hands joined together round the work.', 'Wishing you a day of working hand in hand with others.', 'Listen to colleagues or family before you decide.'],
    ['Perseverance', 'A water drop, day after day,|In time can soften the hardest stone.', 'Steady effort each day is worth cherishing.', 'Keep going with unfinished work; do not give up too soon.'],
    ['Clarity', 'The moon shines on the clear water,|A clear mind lets ideas shine.', 'Wishing you a clear and alert mind today.', 'Write down what is on your mind to see it more clearly.'],
    ['Harmony', 'A smile, a friendly word of greeting,|A happy home feels like spring.', 'Harmony at home is the root of every joy.', 'Reach out to someone you have not talked to in a while.'],
    ['Rising', 'A young sprout pushes through the soil,|Through sun and rain it stays green.', 'A little progress each day is precious.', 'Learn one new thing, however small.'],
    ['Gratitude', 'When drinking water, remember the source,|Gratitude keeps the heart gentle.', 'Gratitude makes an ordinary day beautiful.', 'Write down three things you are grateful for today.'],
    ['Confidence', 'A tiger cub walks through the forest,|Head held high, sincere and calm.', 'Wishing you more confidence in what you do.', 'Speak up and share your idea.'],
    ['Freshness', 'Apricot blossoms open on the branch,|A joyful day opens its door.', 'Wishing you a fresh day to begin what you want.', 'Tidy your desk or a corner of your home.'],
    ['Sincerity', 'Honest words, as clear as jade,|Let trust and friendship grow.', 'Sincerity is precious in every relationship.', 'Keep one promise, even a small one.'],
    ['At Ease', 'Slow down, the road is long ahead,|Watch the clouds, no one is rushing you.', 'Slow down a little to see the beauty of the day.', 'Eat lunch slowly, without looking at your phone.'],
    ['Reunion', 'A warm meal full of laughter,|Family is a place of rest.', 'Wishing your family warmth and togetherness.', 'Make time for dinner with your loved ones.'],
    ['Kind Helpers', 'A friend beside you on the road,|One good piece of advice brightens the day.', 'Wishing you meet people happy to share and show the way.', 'Do not hesitate to ask someone with experience.'],
    ['Steadiness', 'A tall mountain under blue sky,|Through wind and rain it stands firm.', 'With a steady heart, hard things feel lighter.', 'Do the hardest task first, while you have the most energy.'],
    ['Generosity', 'The great sea holds a hundred rivers,|A wide heart lets sorrow fade.', 'Let a small thing go and your heart feels lighter.', 'Forgive something that still weighs on your mind.'],
    ['Creativity', 'A brush paints a flying kite,|Good ideas soar, fresh and new.', 'Wishing you a day full of new ideas.', 'Try doing a familiar task a different way.'],
    ['Diligence', 'The busy bee works morning and night,|Fragrant flowers fill the hive with honey.', 'Diligence each day is the root of achievement.', 'Finish one task fully before moving to the next.'],
    ['Serenity', 'An evening bell rings through the air,|Let go of the old, and calm returns.', 'Let go of old worries and welcome the new day gently.', 'Take a short walk outside and look at the trees.'],
    ['Kindred Spirit', 'A warm cup of tea and a chat,|A good friend nearby, no worries.', 'Wishing you heartwarming conversations.', 'Call an old friend to say hello.'],
    ['Purpose', 'A bird flies high across the sky,|Knowing where it goes, it does not waver.', 'Wishing you steady steps on the path you have chosen.', 'Review this month\'s goals and tick off what you have done.'],
    ['Endurance', 'Plant a tree and wait the seasons through,|Flowers and fruit take their own time.', 'Good things need time to blossom.', 'Be a little more patient with yourself and others.'],
    ['Warmth', 'A glowing hearth on a winter night,|Kind words warm a heart far away.', 'The warmth you give is a lovely gift for those who receive it.', 'Send a kind message to someone far away.'],
    ['Steady Progress', 'One step up each day,|No step of a hundred is forgotten.', 'Every small step deserves recognition.', 'Praise yourself for one thing you did well yesterday.'],
    ['Gentleness', 'Gentle words, like cool clear water,|Pleasant to everyone who hears.', 'Gentle words make someone\'s day easier.', 'Try speaking a little slower and softer today.'],
    ['Fulfillment', 'The full moon round in the high sky,|Each task completed, a cheerful heart.', 'Wishing you a full day, rich with joy.', 'Finish the small tasks still left undone.'],
    ['Shine', 'A stone in the morning sunlight,|Its colours sparkle, catching every eye.', 'Everyone has their own beauty, like every stone.', 'Wear something you love and step out with confidence.'],
    ['Optimism', 'After the rain the sky turns rosy,|A rainbow arches over the fields.', 'Wishing you see the bright side of today.', 'Find one joyful thing in what you are doing.'],
    ['Loyalty', 'A faithful heart for a hundred years,|Bonds that are cared for stay whole.', 'Lasting relationships are precious.', 'Cherish the people who have stood by you for so long.'],
    ['Growing Up', 'A tiger cub learns to walk and fly,|Different each day, better each day.', 'Phước Lộc wishes you one more step forward every day.', 'Set yourself a small challenge and complete it.']
  ];

  /* [name, meaning, look] in the same order as que-data.js STONES; the element list is taken from there */
  var STONES = [
    ['Tri-colour rutilated quartz', 'the union of Heaven, Earth and Humanity', 'fine multicoloured threads woven inside clear stone'],
    ['Golden rutilated quartz', 'prosperity in business', 'golden threads inside clear stone'],
    ['Red rutilated quartz', 'vitality and self-confidence', 'coppery red threads inside the stone'],
    ['Green rutilated quartz', 'a balanced mind', 'green threads inside the stone'],
    ['Black rutilated quartz', 'personal protection', 'sharp black threads inside clear stone'],
    ['Brown rutilated quartz', 'stability', 'warm brown threads inside the stone'],
    ['Snowflake phantom quartz', 'harmonious relationships', 'white snowflake-like specks inside the stone'],
    ['Citrine', 'prosperity and career', 'a clear honey-yellow colour'],
    ['Clear quartz', 'freshness and ease', 'transparent, sparkling in the light'],
    ['Amethyst', 'peace', 'purple shades from light to deep'],
    ['Rose quartz', 'loving bonds', 'a soft powder-pink colour'],
    ['Golden-brown tiger\'s eye', 'calmness', 'golden-brown bands that shimmer as the stone turns'],
    ['Green tiger\'s eye', 'advancement at work', 'a green sheen that moves as the stone turns'],
    ['Blue tiger\'s eye', 'focus', 'a blue sheen that moves as the stone turns'],
    ['Tourmaline', 'joy and optimism', 'many colours on one strand'],
    ['Aquamarine', 'gentle feelings and open communication', 'a clear sea-blue colour'],
    ['Garnet', 'faithfulness', 'a deep wine-red colour'],
    ['Amber', 'warmth', 'a warm honey-gold colour'],
    ['Peridot', 'calmness', 'a bright olive-green colour'],
    ['Topaz', 'creativity', 'clear, sparkling in the light'],
    ['Ruby', 'close relationships', 'a deep red that catches the light'],
    ['Jade', 'peace', 'a smooth glossy surface, soft on the eyes'],
    ['Jadeite jade', 'peace and elegant beauty', 'a soft jade-green, smooth glossy surface'],
    ['Hetian jade', 'peace and elegant beauty', 'an ivory white, smooth as wax']
  ];

  FT.QUE_EN = {
    list: LIST.map(function (q, i) { return { no: i + 1, name: q[0], verse: q[1].split('|'), loi: q[2], khuyen: q[3] }; }),
    stones: STONES.map(function (s, i) { return { name: s[0], menh: VI.stones[i].menh, m: s[1], look: s[2] }; }),
    colors: {
      'Kim': 'yellow, brown, white, grey',
      'Mộc': 'black, blue, green',
      'Thủy': 'white, grey, black, blue',
      'Hỏa': 'green, red, pink, purple',
      'Thổ': 'red, pink, purple, yellow, brown'
    },
    wish: [
      'Wishing you a cheerful, peaceful day full of joy.',
      'Wishing you a day full of positive energy.',
      'Wishing you and your family a warm and fulfilling day.',
      'Wishing you a smooth working day with many smiles.'
    ],
    holy: {
      '1': { title: 'First day of the lunar month', wish: 'On the first day of the lunar month, we wish you a new month begun with a kind heart, inner peace and gratitude.' },
      '15': { title: 'Full moon day', wish: 'On this full moon day, we wish you a calm heart, gentle words and appreciation for what you have.' },
      '4-15': { title: 'Vesak season', wish: 'In this Vesak season, we wish you and your family peace, compassion and kindness every day.' },
      '7-15': { title: 'Vu Lan season', wish: 'In this Vu Lan season, we wish you and your family gratitude toward parents and grandparents, and a heart full of filial love.' }
    },
    holyThink: [
      'May each of us begin the day with a kind thought and a good deed.',
      'Keeping your word in small things builds trust in big ones.',
      'One less angry word, one more moment of listening.',
      'Gratitude to parents, teachers and everyone who quietly cares for us each day.',
      'Being content with what we have is a joy in itself.',
      'A gentle word today is a gift to the person beside you.'
    ],
    service: 'Phước Lộc offers product testing and provides a testing report when customers request it.',
    note: 'This blessing is a kind wish, in the spirit of Vietnamese folk tradition.',
    holyNote: 'Phước Lộc wishes you and your family peace.',
    doubleDay: 'Today is the double date {d}/{d}. The Fire Tiger wishes you a really happy day.',
    holyIdle: ['The Fire Tiger wishes you a peaceful day 🪷', 'Wishing you and your family peace and harmony.', 'One less angry word, one more moment of listening.', 'Being content with what we have is a joy in itself.'],
    cta: 'Message Phước Lộc for detailed advice.',
    site: VI.site
  };

  FT.BRAND_EN = {
    lines: {
      IDLE: ['Hello! The Phước Lộc Fire Tiger is happy to welcome you 🐯', 'Give the Fire Tiger a gentle tap ✨', 'Phước Lộc — Nâng Tầm Đẳng Cấp'],
      TOUCH: ['Thank you for visiting the Fire Tiger ❤️', 'Purr purr… the Fire Tiger loves that 🐾', 'The Fire Tiger says hello'],
      HAPPY: ['The Fire Tiger is happy to meet you ✨', 'Wishing you a day full of joy ❤️', 'Phước Lộc thanks you for stopping by'],
      FLY: ['Up goes the Phước Lộc Fire Tiger 🪽', 'Phước Lộc — Nâng Tầm Đẳng Cấp ✨', 'One flying lap to say hello'],
      FIRE: ['Deep breath… whoosh! 🔥', 'A warm flame to greet you 🔥', 'A small flame, a warm heart 🔥'],
      SLEEP: ['The Fire Tiger is resting; tap to wake it up 🌙', 'Zzz… 🌙'],
      THINKING: ['The Fire Tiger is checking, one moment please…', 'Let the Fire Tiger take a look…'],
      ERROR: ['Not finished yet, please try again.', 'Something went wrong, please ask a Phước Lộc staff member.']
    },
    idleTalk: [
      'Welcome to Đá Phong Thủy Phước Lộc 🐯',
      'Phước Lộc — Nâng Tầm Đẳng Cấp',
      'Every stone has its own colour, pattern and light ✨',
      'Try turning a stone under the light to see its pattern.',
      'Traditionally, each stone colour is believed to symbolize something good.',
      'Tap 🎋 Daily blessing to receive a morning wish from the Fire Tiger.',
      'Message Phước Lộc for detailed advice.',
      'Phước Lộc offers product testing and provides a testing report when customers request it.',
      'Bracelets, stone jewellery, display stones, stone statues… just ask Phước Lộc.',
      'A sincere thank-you makes the day warmer.',
      'Keeping your word in small things builds trust in big ones.'
    ]
  };
})(typeof window !== 'undefined' ? window : globalThis);
