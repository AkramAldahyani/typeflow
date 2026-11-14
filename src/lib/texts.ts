export const COMMON_WORDS = `the of and a to in is you that it he was for on are as with his they at be this have from or one had by word but not what all were we when your can said there use an each which she do how their if will up other about out many then them these so some her would make like him into time has look two more write go see number no way could people my than first water been call who now find long down day did get come made may part over new sound take only little work know place year live me back give most very after thing our just name good sentence man think say great where help through much before line right too mean old any same tell follow came want show also around form three small set put end does another well large must big even such because turn here why ask went men read need land different home us move try kind hand picture again change off play spell air away animal house point page letter mother answer found study still learn should world high every near add food between own below country plant last school father keep tree never start city earth eye light thought head under story saw left few while along might close something seem next hard open example begin life always those both paper together got group often run important until children side feet car mile night walk white sea began grow took river four carry state once book hear stop without second later miss idea enough eat face watch far real almost let above girl sometimes mountain cut young talk soon list song being leave family quiet music steady hold slow fast note`.split(' ');

export const LONG_WORDS = `rhythm deliberate quietly measure practice balance harmony keyboard accurate patience language particular although knowledge experience symphony variable structure beautiful necessary character attention tempo cadence movement position sequence gradual composer instrument whatever thousand question evening distance surprise familiar complete remember probably consider opposite perhaps exercise interval rehearse especially fluency confident improve`.split(' ');

export const GENTLE_WORDS = COMMON_WORDS.filter((w) => w.length <= 5);

export interface Quote {
  text: string;
  source: string;
}

/** Public-domain passages. Straight quotes only so they are typeable on any keyboard. */
export const QUOTES: Quote[] = [
  {
    text: 'Happy families are all alike; every unhappy family is unhappy in its own way.',
    source: 'Leo Tolstoy, Anna Karenina',
  },
  {
    text: 'We are all in the gutter, but some of us are looking at the stars.',
    source: "Oscar Wilde, Lady Windermere's Fan",
  },
  {
    text: 'Nothing is so painful to the human mind as a great and sudden change.',
    source: 'Mary Shelley, Frankenstein',
  },
  {
    text: 'Trust thyself: every heart vibrates to that iron string.',
    source: 'Ralph Waldo Emerson, Self-Reliance',
  },
  {
    text: 'I am no bird; and no net ensnares me: I am a free human being with an independent will.',
    source: 'Charlotte Bronte, Jane Eyre',
  },
  {
    text: '"Begin at the beginning," the King said, very gravely, "and go on till you come to the end: then stop."',
    source: "Lewis Carroll, Alice's Adventures in Wonderland",
  },
  {
    text: 'It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.',
    source: 'Jane Austen, Pride and Prejudice',
  },
  {
    text: 'I celebrate myself, and sing myself, and what I assume you shall assume, for every atom belonging to me as good belongs to you.',
    source: 'Walt Whitman, Song of Myself',
  },
  {
    text: "You don't know about me without you have read a book by the name of The Adventures of Tom Sawyer; but that ain't no matter.",
    source: 'Mark Twain, Adventures of Huckleberry Finn',
  },
  {
    text: 'It was the best of times, it was the worst of times, it was the age of wisdom, it was the age of foolishness, it was the epoch of belief, it was the epoch of incredulity, it was the season of Light, it was the season of Darkness.',
    source: 'Charles Dickens, A Tale of Two Cities',
  },
  {
    text: 'Call me Ishmael. Some years ago, never mind how long precisely, having little or no money in my purse, and nothing particular to interest me on shore, I thought I would sail about a little and see the watery part of the world.',
    source: 'Herman Melville, Moby-Dick',
  },
  {
    text: 'I went to the woods because I wished to live deliberately, to front only the essential facts of life, and see if I could not learn what it had to teach, and not, when I came to die, discover that I had not lived.',
    source: 'Henry David Thoreau, Walden',
  },
  {
    text: 'In my younger and more vulnerable years my father gave me some advice that I have been turning over in my mind ever since. "Whenever you feel like criticizing any one," he told me, "just remember that all the people in this world have not had the advantages that you have had."',
    source: 'F. Scott Fitzgerald, The Great Gatsby',
  },
  {
    text: 'Emma Woodhouse, handsome, clever, and rich, with a comfortable home and happy disposition, seemed to unite some of the best blessings of existence; and had lived nearly twenty-one years in the world with very little to distress or vex her.',
    source: 'Jane Austen, Emma',
  },
  {
    text: 'Whether I shall turn out to be the hero of my own life, or whether that station will be held by anybody else, these pages must show. To begin my life with the beginning of my life, I record that I was born (as I have been informed and believe) on a Friday, at twelve o\'clock at night.',
    source: 'Charles Dickens, David Copperfield',
  },
];

export const quoteLength = (q: Quote): 'short' | 'medium' | 'long' =>
  q.text.length < 100 ? 'short' : q.text.length < 200 ? 'medium' : 'long';

/** Sentences the landing-page demo types by itself. */
export const DEMO_LINES = [
  'Good typing sounds like a steady drumbeat, not a sudden downpour.',
  'Watch the notes below. Even spacing means your hands have found the beat.',
  'Speed is what happens after the rhythm settles in.',
];

export const DEFAULT_CUSTOM_TEXT =
  'Paste anything you want to practise here: a paragraph from your notes, a speech you are learning, or the opening of a story you love.';
