interface PoetryData {
  content: string // "浓雾知秋晨气润，薄云遮日午阴凉，不须飞盖护戎装。"
  popularity: number // 361000
  origin: {
    title: string // "浣溪沙·江村道中"
    dynasty: string // "宋代"
    author: string // "范成大"
    content: string[] // [ "十里西畴熟稻香，槿花篱落竹丝长，垂垂山果挂青黄。", "浓雾知秋晨气润，薄云遮日午阴凉，不须飞盖护戎装。" ],
    translate: string[] // [ "金灿灿的十里平畴，飘来扑鼻的稻香，红艳艳的木槿花开在农舍的竹篱旁，迎风摇曳的毛竹又青又长，青黄相间的累累山果，笑盈盈地挂在枝头上。", "秋天的早晨雾气渐浓，湿润的空气令人清爽。正午的薄云又遮住了太阳，更不用随从张盖护住我的戎装。" ]
  },
  matchTags: string[] // [ "白天", "秋" ]
  recommendedReason: string // ""
}
