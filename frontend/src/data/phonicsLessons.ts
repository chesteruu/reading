export type Articulation = {
  tongue: string;
  lips: string;
  throat: string;
  tip: string;
};

export type PhonicsLesson = {
  id: string;
  group: string;
  title: string;
  subtitle: string;
  grapheme: string;
  ipa: string;
  speak: string;
  articulation: Articulation;
  examples: string[];
  coach: string;
};

export type PhonicsGroup = {
  id: string;
  title: string;
  blurb: string;
};

export const PHONICS_GROUPS: PhonicsGroup[] = [
  { id: "short", title: "短元音 Short Vowels", blurb: "嘴巴张开一点点，声音短而清脆。" },
  { id: "long", title: "长元音 Long Vowels", blurb: "声音拉长，像字母名字。" },
  { id: "digraph", title: "字母组合 Digraphs", blurb: "两个字母手拉手，只发一个音。" },
  { id: "consonant", title: "辅音 Consonants", blurb: "舌头、牙齿、嘴唇一起排队。" },
];

export const PHONICS_LESSONS: PhonicsLesson[] = [
  {
    id: "short-a",
    group: "short",
    title: "短 a",
    subtitle: "cat / æ",
    grapheme: "a",
    ipa: "æ",
    speak: "a",
    articulation: {
      tongue: "舌头放低、靠前，舌尖轻轻抵住下牙内侧。",
      lips: "嘴巴横向张开，像轻轻微笑，上下牙齿稍稍分开。",
      throat: "喉咙放松，气息平稳送出，不要挤嗓子。",
      tip: "可以说：把舌头摊平，嘴巴横着打开，发出短短的「啊欸」。",
    },
    examples: ["cat", "mat", "apple", "dad"],
    coach: "短 a 不是中文「啊」。嘴角更开一点，声音更亮一点。",
  },
  {
    id: "short-e",
    group: "short",
    title: "短 e",
    subtitle: "bed / e",
    grapheme: "e",
    ipa: "e",
    speak: "e",
    articulation: {
      tongue: "舌头中部略抬起，比短 a 高一点，仍靠前。",
      lips: "嘴唇自然微开，比微笑收一点。",
      throat: "气流从口腔前部送出，保持短促。",
      tip: "想像医生说「哎」，但更短、更扁。",
    },
    examples: ["bed", "red", "hen", "egg"],
    coach: "短 e 别发成「衣」。嘴再张开一点。",
  },
  {
    id: "short-i",
    group: "short",
    title: "短 i",
    subtitle: "it / ɪ",
    grapheme: "i",
    ipa: "ɪ",
    speak: "ih",
    articulation: {
      tongue: "舌面前部抬高，接近上颚，但不要贴死。",
      lips: "嘴唇微展，开口很小。",
      throat: "声音短促，像轻轻「咦」一下就停。",
      tip: "这是 it、sit、little 里的音，不是字母 I 的 [ai]。",
    },
    examples: ["it", "sit", "little", "fish"],
    coach: "短 i 和代词 I 完全不同：一个是 [ɪ]，一个是 [ai]。",
  },
  {
    id: "short-o",
    group: "short",
    title: "短 o",
    subtitle: "hot / ɒ",
    grapheme: "o",
    ipa: "ɒ",
    speak: "o",
    articulation: {
      tongue: "舌头放低靠后，口腔空间变大。",
      lips: "嘴巴圆圆地张开，像含着一颗小葡萄。",
      throat: "声音从口腔中后部出来，短而圆。",
      tip: "不要发成中文「哦」拖长音。",
    },
    examples: ["hot", "dog", "box", "on"],
    coach: "短 o 嘴巴要圆，声音要短。",
  },
  {
    id: "short-u",
    group: "short",
    title: "短 u",
    subtitle: "sun / ʌ",
    grapheme: "u",
    ipa: "ʌ",
    speak: "u",
    articulation: {
      tongue: "舌头中央放低，位置居中。",
      lips: "嘴唇自然张开，不圆也不扁。",
      throat: "放松发声，像轻轻「呃」一下。",
      tip: "cup、sun、duck 都是这个音。",
    },
    examples: ["sun", "cup", "duck", "up"],
    coach: "短 u 很放松，不要收成「乌」。",
  },
  {
    id: "long-ai",
    group: "long",
    title: "长 a / I",
    subtitle: "ai · name · I",
    grapheme: "a_e / I",
    ipa: "ai / ei",
    speak: "eye",
    articulation: {
      tongue: "先低后高：舌位从低滑向高前位。",
      lips: "从较开慢慢收到微笑状。",
      throat: "这是双元音，要有滑动，不能只发一个固定口型。",
      tip: "代词 I 读 [ai]；cake 里的 a_e 读 [ei]。",
    },
    examples: ["I", "my", "cake", "name"],
    coach: "听到滑动了吗？从开口到收口，一口滑过去。",
  },
  {
    id: "long-ee",
    group: "long",
    title: "长 e",
    subtitle: "see / i:",
    grapheme: "ee / ea",
    ipa: "i:",
    speak: "ee",
    articulation: {
      tongue: "舌面前部高高抬起，靠近上颚。",
      lips: "嘴角向两侧拉开，像开心地笑。",
      throat: "声音可以拉长，保持平稳。",
      tip: "sea、see、me 都是这个音。",
    },
    examples: ["see", "sea", "me", "tree"],
    coach: "长 e 要笑着说，声音拉长一点点。",
  },
  {
    id: "long-oh",
    group: "long",
    title: "长 o",
    subtitle: "boat / əu",
    grapheme: "oa / o_e",
    ipa: "əu",
    speak: "oh",
    articulation: {
      tongue: "舌头从中央稍后位置向前上滑动。",
      lips: "从半开逐渐收成圆形。",
      throat: "双元音，要滑，不要僵住。",
      tip: "boat、go、home 都带这个滑动。",
    },
    examples: ["boat", "go", "home", "yellow"],
    coach: "嘴唇要越说越圆。",
  },
  {
    id: "digraph-th",
    group: "digraph",
    title: "th",
    subtitle: "voiced ð · voiceless θ",
    grapheme: "th",
    ipa: "ð / θ",
    speak: "dh",
    articulation: {
      tongue: "舌尖轻轻伸出，放在上下门牙之间。",
      lips: "牙齿轻轻咬住舌尖，不要咬疼。",
      throat: "the 里的 th 声带震动（ð）；think 里的 th 声带不震动（θ）。",
      tip: "把手放在喉咙：震动是 the，不震动是 think。",
    },
    examples: ["the", "this", "think", "three"],
    coach: "舌头一定要露一点点。藏在牙齿后面就错了。",
  },
  {
    id: "digraph-sh",
    group: "digraph",
    title: "sh",
    subtitle: "ship / ʃ",
    grapheme: "sh",
    ipa: "ʃ",
    speak: "sh",
    articulation: {
      tongue: "舌尖靠近上牙龈后方，形成一条窄缝。",
      lips: "嘴唇略微前突，像小声说「嘘」。",
      throat: "气流从窄缝摩擦而出，声带不震动。",
      tip: "像安抚宝宝：shhh。",
    },
    examples: ["ship", "fish", "she", "shop"],
    coach: "嘴唇往前一点点，气流更集中。",
  },
  {
    id: "digraph-ch",
    group: "digraph",
    title: "ch",
    subtitle: "chip / tʃ",
    grapheme: "ch",
    ipa: "tʃ",
    speak: "ch",
    articulation: {
      tongue: "先用舌尖堵住上牙龈，再突然放开。",
      lips: "略微前突，像 sh，但更有爆发。",
      throat: "这是塞擦音：先堵再放，带一点摩擦。",
      tip: "像中文「吃」的开头，但更短更干净。",
    },
    examples: ["chip", "chair", "lunch", "beach"],
    coach: "先堵住，再喷出去。",
  },
  {
    id: "digraph-oo",
    group: "digraph",
    title: "oo",
    subtitle: "look ʊ · moon u:",
    grapheme: "oo",
    ipa: "ʊ / u:",
    speak: "uu",
    articulation: {
      tongue: "舌后部抬高；look 较短，moon 更靠后且拉长。",
      lips: "嘴唇收圆，像吹小气泡。",
      throat: "look、book 用短 [ʊ]；moon、food 用长 [u:]。",
      tip: "先练 look（短圆），再练 moon（长圆）。",
    },
    examples: ["look", "book", "moon", "food"],
    coach: "同一组字母，长短不一样，靠词来记。",
  },
  {
    id: "cons-b",
    group: "consonant",
    title: "b / p",
    subtitle: "双唇爆破",
    grapheme: "b · p",
    ipa: "b / p",
    speak: "b",
    articulation: {
      tongue: "舌头放松，不出力。",
      lips: "双唇紧闭，再突然张开送气。",
      throat: "b 声带震动；p 声带不震动，气更强。",
      tip: "把手放嘴前：p 的气更冲，b 更软。",
    },
    examples: ["boat", "big", "pat", "cup"],
    coach: "闭唇 → 打开。b 有声音，p 主要是气。",
  },
  {
    id: "cons-d",
    group: "consonant",
    title: "d / t",
    subtitle: "舌尖齿龈音",
    grapheme: "d · t",
    ipa: "d / t",
    speak: "d",
    articulation: {
      tongue: "舌尖抵住上牙龈（齿龈脊），再弹开。",
      lips: "自然张开即可。",
      throat: "d 震动；t 不震动。",
      tip: "舌尖位置比中文「的」更靠前一点的牙龈处。",
    },
    examples: ["duck", "dad", "tap", "cat"],
    coach: "舌尖点一下上牙龈，再放开。",
  },
  {
    id: "cons-m",
    group: "consonant",
    title: "m / n / ng",
    subtitle: "鼻音家族",
    grapheme: "m · n · ng",
    ipa: "m / n / ŋ",
    speak: "m",
    articulation: {
      tongue: "m 舌头放松；n 舌尖抵上牙龈；ng 舌后抵软腭。",
      lips: "m 双唇闭合；n/ng 嘴巴可微开。",
      throat: "气流从鼻子出来，声带震动。捏住鼻子就发不出。",
      tip: "唱「嗯——」时鼻子会痒痒的，就是鼻音。",
    },
    examples: ["mom", "sun", "sing", "mango"],
    coach: "捏鼻子试一试：说不出，就对了。",
  },
  {
    id: "cons-l",
    group: "consonant",
    title: "l / r",
    subtitle: "液体音",
    grapheme: "l · r",
    ipa: "l / r",
    speak: "l",
    articulation: {
      tongue: "l：舌尖抵上牙龈，两边留缝；r：舌尖上卷，不碰牙龈。",
      lips: "r 时嘴唇可略圆；l 更自然。",
      throat: "两个都是浊音，要有声音。",
      tip: "l 像「勒」的舌尖贴法；r 舌尖要卷起来悬空。",
    },
    examples: ["look", "little", "red", "run"],
    coach: "l 贴住，r 卷起。这是中文孩子最容易混的一对。",
  },
];

export function lessonsByGroup(groupId: string): PhonicsLesson[] {
  return PHONICS_LESSONS.filter((lesson) => lesson.group === groupId);
}

export function findLesson(id: string): PhonicsLesson | undefined {
  return PHONICS_LESSONS.find((lesson) => lesson.id === id);
}
