// app/lib/views.ts
// The photos shown in the "Views" section. This is your curated list: edit it any time.
//
// How to add a photo:
//   1. Copy the file into your project's  public/images/  folder.
//   2. Add a line below. `file` is the file name inside public/images/, for example 'sunrise.webp'.
//      (A file in a sub-folder is written like 'views/sunrise.webp'. A file elsewhere in public/ starts with a slash, like '/hero.jpeg'.)
//   3. Deploy.
//
// The order here is the order on the site, so put your strongest photos first.
// `caption` and `tag` are optional. Photos that share a tag can be filtered by that tag on the site,
// so keep tag names few and short. A file that is missing is simply skipped, so a typo never shows a broken picture.
// Room photos (bed*, bathroom*) are not listed here: they belong to the rooms, added in the admin page.

export type View = { file: string; caption?: string; tag?: string };

export const VIEWS: View[] = [
  // Views
  { file: 'scenicview.webp', caption: 'A view worth waking up for', tag: 'Views' },
  { file: 'viewfromprperty.webp', caption: 'The view from our property', tag: 'Views' },
  { file: 'brightvayview.webp', caption: 'Bright, clear mornings', tag: 'Views' },
  { file: 'windowview.webp', caption: 'Straight from your window', tag: 'Views' },
  { file: 'pokhara.webp', caption: 'Pokhara below', tag: 'Views' },
  { file: 'surrounding.webp', caption: 'Green all around', tag: 'Views' },

  // Guests
  { file: 'guest.webp', caption: 'Picture with guest', tag: 'Guests'},
  { file: 'guest1.webp', caption: 'Picture with guest', tag: 'Guests'},
  { file: 'guest2.webp', caption: 'Picture with guest', tag: 'Guests'},
  { file: 'guest3.webp', caption: 'Picture with guest', tag: 'Guests'},
  { file: 'guest4.webp', caption: 'Picture with guest', tag: 'Guests'},
  { file: 'guest5.webp', caption: 'Picture with guest', tag: 'Guests'},
  { file: 'guest6.webp', caption: 'Picture with guest', tag: 'Guests'},
  { file: 'guest7.webp', caption: 'Picture with guest', tag: 'Guests'},
  { file: 'guest8.webp', caption: 'Picture with guest', tag: 'Guests'},

  // Village and countryside
  { file: 'terracefields.webp', caption: 'Terraced fields', tag: 'Village' },
  { file: 'villageview.webp', caption: 'The village from above', tag: 'Village' },
  { file: 'village.webp', caption: 'Village life, Kaskikot', tag: 'Village' },
  { file: 'farm.webp', caption: 'Working farms nearby', tag: 'Village' },
  { file: 'farming.webp', caption: 'Fields in season', tag: 'Village' },
  { file: 'trail.webp', caption: 'Walking trails from the door', tag: 'Village' },
  { file: 'village3.webp', caption: 'Quiet village lanes', tag: 'Village' },
  { file: 'village4.webp', caption: 'Kaskikot village', tag: 'Village' },
  { file: 'temple.webp', caption: 'A local temple', tag: 'Village' },

  // Around the property
  { file: 'pond.webp', caption: 'The pond', tag: 'Property' },
  { file: 'closeuppond.webp', caption: 'Still water, up close', tag: 'Property' },
  { file: 'swing.webp', caption: 'The swing', tag: 'Property' },
  { file: 'terracefields.webp', caption: 'Terraced fields', tag: 'Property' },
  { file: 'villageview.webp', caption: 'The village from above', tag: 'Property' },

    // Rooms
  { file: 'bed.webp', caption: 'Comfortable beds', tag: 'Rooms' },
  { file: 'bed1.webp', caption: 'Rest easy after a day outdoors', tag: 'Rooms' },
  { file: 'bed2.webp', caption: 'Warm, simple and clean', tag: 'Rooms' },
  { file: 'bed3.webp', caption: 'Wake up to fresh mountain air', tag: 'Rooms' },
  { file: 'bed4.webp', caption: 'A quiet place to sleep', tag: 'Rooms' },
  { file: 'bed5.webp', caption: 'Made for slow mornings', tag: 'Rooms' },
  { file: 'bathroom1.webp', caption: 'Clean attached bathrooms', tag: 'Rooms' },
  { file: 'bathroom2.webp', caption: 'Hot water, fresh towels', tag: 'Rooms' },
  { file: 'bathroom3.webp', caption: 'Bright and tidy', tag: 'Rooms' },
  { file: 'bathroom4.webp', caption: 'Everything you need', tag: 'Rooms' },
  { file: 'bathroom5.webp', caption: 'Modern, spotless fittings', tag: 'Rooms' },
];

export const VIEWS_FOLDER = '/images/';
export const viewSrc = (file: string) => (file.startsWith('/') ? file : `${VIEWS_FOLDER}${file.replace(/^\/+/, '')}`);