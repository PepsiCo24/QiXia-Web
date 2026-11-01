import type { Metadata } from 'next'
import { PhotoStudio } from '@/components/qixia/photo/photo-studio'
import './photo.css'

export const metadata: Metadata = {
  title: '栖小猫·栖霞留影 | 栖霞山',
  description: '和栖小猫一起，把栖霞的美好带回家。拍照、自然滤镜与本机高清纪念照。',
}

export default function PhotoPage() {
  return <PhotoStudio />
}
