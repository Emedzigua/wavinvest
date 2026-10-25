// All photos and video in one place. These are free Pexels placeholders —
// to use your own, drop the files into /public/media and change the paths
// here (e.g. "/media/hero.mp4").

const pexels = (path: string) => `https://images.pexels.com/photos/${path}`;

export const media = {
  hero: {
    // Desktop only. Phones and "save data" visitors get the poster image.
    video: "https://videos.pexels.com/video-files/6194507/6194507-hd_1920_1080_30fps.mp4",
    poster: pexels("23625701/pexels-photo-23625701/free-photo-of-stacks-of-wooden-pallets-outside-industrial-warehouse.jpeg"),
  },
  products: {
    epal: pexels("34908275/pexels-photo-34908275/free-photo-of-stacked-wooden-pallets-in-warehouse-setting.jpeg"),
    collars: pexels("14674132/pexels-photo-14674132.jpeg"),
  },
  why: pexels("9552902/pexels-photo-9552902.jpeg"),
  og: pexels("23625701/pexels-photo-23625701/free-photo-of-stacks-of-wooden-pallets-outside-industrial-warehouse.jpeg"),
};

// Company details shown in the footer and structured data — replace with real ones.
export const company = {
  name: "WAV Invest",
  email: "info@wavinvest.eu",
  phone: "+00 000 000 000",
  address: "Street 1, 000 00 City, Country",
};
