import { MousePointer, Plus, Circle, Target } from "lucide-react";

export const cursorOptions = [
  {
    id: 'diagonal' as const,
    name: 'Đường chéo',
    icon: Plus,
    description: 'Con trỏ dấu cộng lớn',
    cursor: 'crosshair'
  },
  {
    id: 'dot' as const,
    name: 'Dấu chấm',
    icon: Circle,
    description: 'Con trỏ dấu chấm to',
    cursor: 'default'
  },
  {
    id: 'arrow' as const,
    name: 'Mũi tên',
    icon: MousePointer,
    description: 'Con trỏ mũi tên chuẩn',
    cursor: 'pointer'
  },
  {
    id: 'illustration' as const,
    name: 'Minh họa',
    icon: Target,
    description: 'Con trỏ mũi tên với vòng tròn',
    cursor: 'move'
  }
];
