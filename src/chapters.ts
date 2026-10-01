export type Vec3 = readonly [number, number, number];
export interface Viewpoint { position: Vec3; target: Vec3 }
export interface Chapter extends Viewpoint {
  id: string;
  line: string;
  subtitle: string;
  title: string;
  description: string;
  detail: string;
}

export const overview: Viewpoint = { position: [92, 70, 139], target: [-17, 8, 12] };
export const chapters: readonly Chapter[] = [
  {
    id: 'frost', line: '月落乌啼霜满天', subtitle: '落月 · 乌啼 · 霜天',
    title: '月落乌啼霜满天。',
    description: '一轮落月，几声乌啼。\n霜意漫过江岸，天地间只余清寒。',
    detail: '望月于江岸 · 寒夜初深',
    position: [22, 23, 72], target: [-25, 14, -56],
  },
  {
    id: 'maples', line: '江枫渔火对愁眠', subtitle: '江枫 · 渔火 · 愁眠',
    title: '江枫渔火对愁眠。',
    description: '枫叶映着渔火，灯影浮在江心。\n客舟上的人，仍未入眠。',
    detail: '停舟于枫岸 · 灯火与孤身',
    position: [30, 15, 111], target: [3, 6, 43],
  },
  {
    id: 'temple', line: '姑苏城外寒山寺', subtitle: '姑苏 · 城外 · 古寺',
    title: '姑苏城外寒山寺。',
    description: '城郭隐在夜色深处，古寺独立江边。\n层层檐影里，一盏灯还亮着。',
    detail: '循江望古寺 · 城外有微光',
    position: [8, 30, -5], target: [-57, 10, -69],
  },
  {
    id: 'bell', line: '夜半钟声到客船', subtitle: '夜半 · 钟声 · 客船',
    title: '夜半钟声到客船。',
    description: '钟声越过江面，抵达一叶客船。\n远寺与孤舟，在这一刻相连。',
    detail: '回到客船 · 以光影写钟声',
    position: [58, 43, 151], target: [-14, 10, 38],
  },
];
