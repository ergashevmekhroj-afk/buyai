// A small picture for each product. Pictures: Twemoji (CC BY 4.0, credited in the footer),
// loaded from the jsDelivr CDN. If the picture cannot load, the phone's own emoji is shown instead.
import { useState } from "react";

const EMOJI = {
  rice: "🍚", barley: "🌾", wheat: "🌾", corn: "🌽", compound_feed: "🌾",
  flour_high: "🌾", flour_first: "🌾", bread: "🍞",
  beef: "🥩", mutton: "🐑", poultry: "🍗", fish: "🐟",
  milk: "🥛", eggs: "🥚", butter: "🧈",
  oil_cottonseed: "🫗", oil_sunflower: "🌻", sugar: "🍬",
  lemons: "🍋", apples: "🍎", pears: "🍐", grapes: "🍇", watermelon: "🍉", melon: "🍈", kishmish: "🍇",
  cabbage: "🥬", cucumbers: "🥒", tomatoes: "🍅", eggplant: "🍆", bell_pepper: "🫑", pumpkin: "🎃",
  carrot: "🥕", garlic: "🧄", onion: "🧅", potatoes: "🥔", beans: "🫘", peas: "🫛", mash: "🫘",
};

// emoji -> Twemoji file name, e.g. "🍚" -> "1f35a"
const code = (e) => [...e].map((c) => c.codePointAt(0).toString(16)).filter((h) => h !== "fe0f").join("-");

export default function ProductIcon({ id, size = 22 }) {
  const [failed, setFailed] = useState(false);
  const e = EMOJI[id] ?? "🛒";
  if (failed) return <span className="p-icon" style={{ fontSize: size * 0.9 }} aria-hidden="true">{e}</span>;
  return <img className="p-icon" src={`https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/svg/${code(e)}.svg`}
    width={size} height={size} alt="" aria-hidden="true" loading="lazy" onError={() => setFailed(true)} />;
}
