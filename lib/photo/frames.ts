/** Original, replaceable frame studies; the cat artwork is an existing pet asset. */
export const PHOTO_WIDTH = 1200
export const PHOTO_HEIGHT = 1600

export type FrameId = "maple" | "mountain" | "twilight" | "postcard"

export interface PhotoFrame {
  id: FrameId
  name: string
  description: string
  /** UI swatch; also used for the printed footer. */
  color: string
  accent: string
  paper: string
  ink: string
  caption: string
  motif: "maple" | "mountain" | "moon" | "postcard"
  /** Visible on the composition, so draft decoration is never mistaken for official artwork. */
  draftLabel: string
}

export const FRAMES: readonly PhotoFrame[] = [
  {
    id: "maple", name: "栖霞枫叶季", description: "朱红枫叶，收藏山间秋意",
    color: "#9c4036", accent: "#cf7853", paper: "#fff6e9", ink: "#6e342d",
    caption: "把栖霞的秋天，留在这一刻", motif: "maple", draftLabel: "原创相框 · 设计草案",
  },
  {
    id: "mountain", name: "山间来信", description: "青绿山线，寄一封山中的来信",
    color: "#496b5b", accent: "#91a48b", paper: "#f2f4e9", ink: "#344f45",
    caption: "山色与我，恰好同框", motif: "mountain", draftLabel: "原创相框 · 设计草案",
  },
  {
    id: "twilight", name: "灵猫专属纪念", description: "灵猫与山月，收藏专属的相遇",
    color: "#6d607d", accent: "#c8a778", paper: "#f6f0f5", ink: "#51435f",
    caption: "与灵猫一起，收藏山月微光", motif: "moon", draftLabel: "原创相框 · 设计草案",
  },
  {
    id: "postcard", name: "栖小猫来合影", description: "猫咪与爪印，把今日寄给未来",
    color: "#a36c43", accent: "#c49b62", paper: "#fff8e9", ink: "#795335",
    caption: "来自栖霞山的一张纪念", motif: "postcard", draftLabel: "原创相框 · 设计草案",
  },
]

export function getFrame(id: FrameId): PhotoFrame {
  return FRAMES.find((frame) => frame.id === id) ?? FRAMES[0]
}
