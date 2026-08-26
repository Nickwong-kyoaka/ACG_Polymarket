import type { PublicLocale } from "@/components/acg-locale";

export interface CharacterVoiceProfile {
  line: Record<PublicLocale, string>;
  style: Record<PublicLocale, string>;
  rate: number;
  pitch: number;
  voiceOffset: number;
  ambience: [number, number];
}

const voices: Record<string, CharacterVoiceProfile> = {
  "akari-hoshino": voice("The light is still on for you. Come sit beside me, and we can let today end one song at a time.", "燈還替你亮著。來我身邊坐一下，我們就用一首歌的時間，慢慢把今天放下。", "sunlit and close", "明亮、貼近", 0.9, 1.12, 0, [196, 293.7]),
  "ren-tsukishiro": voice("You do not need the perfect words tonight. Breathe with the quiet, and I will stay for the unfinished parts.", "今晚不用找到最完美的說法。先跟著安靜呼吸，還沒整理好的部分，我會陪你留著。", "low and measured", "低柔、沉穩", 0.78, 0.91, 1, [146.8, 220]),
  "mira-kagetsu": voice("Shoulders down. One tiny break is officially on the schedule, and I saved the best seat for you.", "肩膀先放下來。現在正式排進一小段休息，而且最好的位置已經替你留好了。", "playful and buoyant", "俏皮、輕快", 0.96, 1.16, 2, [220, 329.6]),
  "yatogami-tohka": voice("You have tried hard enough for today. Let us find something warm to eat, then I will cheer for your next step.", "你今天已經很努力了。先一起找點溫暖的東西吃，下一步再讓我好好替你加油。", "open and wholehearted", "坦率、真心", 0.92, 1.08, 0, [196, 261.6]),
  "tokisaki-kurumi": voice("Let the clock keep the worries for a while. This moment belongs to you, and you may rest inside it.", "先讓時鐘替你保管那些煩惱。這一刻只屬於你，你可以安心在裡面休息。", "velvet and unhurried", "絲絨般、從容", 0.76, 0.88, 1, [130.8, 196]),
  "itsuka-kotori": voice("Today's mission can end here. Report received, effort acknowledged, and your next order is to take a real break.", "今天的任務可以先到這裡。報告收到、努力確認，接下來的指令是好好休息。", "crisp and caring", "俐落、關心", 0.94, 1.04, 2, [174.6, 261.6]),
  "tobiichi-origami": voice("You do not have to feel better immediately. I can sit here quietly until your breathing finds its own rhythm.", "你不用立刻振作。我可以安靜坐在這裡，等你的呼吸慢慢找回自己的節奏。", "clear and still", "清澈、安靜", 0.75, 0.94, 0, [146.8, 233.1]),
  "yoshino-himekawa": voice("Even a very small voice can reach someone. I heard you, so you do not need to hide this feeling here.", "就算聲音很小，也能被聽見。我有聽到，所以在這裡不用把心情藏起來。", "soft and airy", "輕柔、帶氣音", 0.79, 1.15, 1, [220, 349.2]),
  "rudeus-greyrat": voice("A small step still changes the road. Rest now, and tomorrow we can try the next spell with steadier hands.", "很小的一步，也會讓道路有所不同。現在先休息，明天再用更安穩的雙手嘗試下一個魔法。", "reflective and warm", "沉思、溫和", 0.82, 0.93, 2, [155.6, 233.1]),
  sylphiette: voice("The wind does not hurry the leaves. Take your time too; I will keep this quiet place beside you.", "風不會催促葉子，你也可以慢慢來。我會替你守著身邊這個安靜的位置。", "gentle and breezy", "溫柔、如微風", 0.8, 1.08, 0, [196, 293.7]),
  "roxy-migurdia": voice("Not knowing yet is simply where learning begins. Close the book for tonight; your effort will still be here tomorrow.", "現在還不會，只是學習開始的地方。今晚先把書闔上，你付出的努力明天仍然會在。", "calm and instructive", "冷靜、耐心", 0.81, 0.97, 1, [174.6, 261.6]),
  sasaki: voice("The shop is closed for today. Leave the complicated things by the door and have one peaceful cup before going home.", "今天可以先打烊了。把複雜的事情留在門邊，回家前安靜喝完這一杯吧。", "mellow and grounded", "醇厚、踏實", 0.78, 0.88, 2, [130.8, 207.7]),
  "yamada-tayama": voice("The light by the back door is still on. Stay for a minute; you do not have to explain why today felt heavy.", "後門那盞燈還亮著。留下來一會吧，今天為什麼沉重，不用急著解釋。", "casual and hushed", "隨性、輕聲", 0.8, 0.92, 0, [146.8, 220]),
  "yani-neko": voice("Step away from the noise for a minute. Find a clean breath, stretch your paws, and let the next mess wait.", "先離開吵鬧一會。找一口舒服的空氣、伸展一下手腳，下一場混亂可以等等。", "raspy and comic", "微沙啞、喜劇感", 0.91, 0.86, 1, [164.8, 246.9]),
  "miyu-suzuki": voice("Every sentence does not need to come out perfectly. The honest little pause is part of what makes you lovely.", "每句話都不用說得完美。那個真誠的小停頓，也正是你可愛的一部分。", "shy and sparkling", "害羞、閃亮", 0.86, 1.14, 2, [220, 329.6]),
  "yusuke-tani": voice("Quiet is not empty. We can share it until the words arrive, or simply let the evening remain gentle.", "安靜並不是空白。我們可以一起等到話語出現，也可以只讓今晚保持溫柔。", "even and reassuring", "平穩、安心", 0.78, 0.9, 0, [146.8, 233.1]),
  "motoko-kusanagi": voice("When the signal gets noisy, return to what you can feel right now: one breath, one choice, one steady step.", "訊號太吵時，就回到此刻真正能感受到的事：一次呼吸、一個選擇、一步安穩的前進。", "focused and resonant", "專注、有共鳴", 0.8, 0.89, 1, [123.5, 196]),
  frieren: voice("Some answers take longer than a human season. You can rest tonight; the road will still remember where you stopped.", "有些答案要走過很長的季節才會明白。今晚可以先休息，道路會記得你停下的位置。", "distant and tender", "悠遠、溫柔", 0.74, 0.94, 2, [146.8, 220]),
  fern: voice("Drink some water and set down the task for ten minutes. Taking care of yourself is part of finishing it well.", "先喝一點水，把手上的事放下十分鐘。照顧好自己，也是把事情做好的一部分。", "composed and dependable", "沉著、可靠", 0.8, 1, 0, [174.6, 261.6]),
  "hitori-gotoh": voice("Even if the words stayed inside today, your heart still made a sound. I will listen until it feels safe to try again.", "就算今天沒能把話說出口，你的心也確實發出了聲音。我會聽著，直到你覺得可以再試一次。", "timid and sincere", "怯生、真誠", 0.79, 1.12, 1, [196, 293.7]),
  "nijika-ijichi": voice("If today's rhythm slipped, we can count in again together. One, two, breathe; three, four, you are back.", "如果今天的節拍亂了，我們就一起重新數拍。一、二，呼吸；三、四，你回來了。", "sunny and rhythmic", "陽光、有節拍", 0.93, 1.09, 2, [220, 329.6]),
  "ruby-hoshino": voice("You do not need to sparkle every second to be loved. Come backstage for a while; your smile can rest here.", "你不需要每一秒都閃閃發光，才值得被喜歡。先到後台休息一會，笑容也可以在這裡放鬆。", "bright and affectionate", "明亮、親暱", 0.9, 1.13, 0, [207.7, 311.1]),
  "kana-arima": voice("The rehearsals nobody sees still belong to you. Be proud of the work, then let yourself have a quiet curtain call tonight.", "那些沒被看見的練習也都屬於你。先為自己的努力驕傲，今晚再安靜謝幕休息。", "poised and candid", "清亮、坦率", 0.86, 1.03, 1, [185, 277.2]),
  "mem-cho": voice("Turn off the filter for a minute. The unedited you is welcome here, messy day and all.", "先把濾鏡關掉一會。沒有剪輯過的你，也連同今天的小混亂一起，在這裡很受歡迎。", "friendly and lively", "親切、活潑", 0.95, 1.1, 2, [220, 349.2]),
};

function voice(en: string, zhHant: string, styleEn: string, styleZhHant: string, rate: number, pitch: number, voiceOffset: number, ambience: [number, number]): CharacterVoiceProfile {
  return { line: { en, "zh-Hant": zhHant }, style: { en: styleEn, "zh-Hant": styleZhHant }, rate, pitch, voiceOffset, ambience };
}

const fallback = voice(
  "You made it through today. Stay here for one quiet breath, and let tomorrow wait outside the door.",
  "你已經走過今天了。先在這裡安靜呼吸一次，讓明天暫時留在門外。",
  "warm and gentle",
  "溫暖、輕柔",
  0.82,
  1,
  0,
  [174.6, 261.6],
);

export function getCharacterVoiceProfile(slug?: string) {
  return (slug && voices[slug]) || fallback;
}

export function getCharacterComfortLine(slug: string | undefined, locale: PublicLocale) {
  return getCharacterVoiceProfile(slug).line[locale];
}

export const characterVoiceSlugs = Object.keys(voices);
