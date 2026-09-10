import fs from 'fs'
import path from 'path'
import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default async function PortfolioPage() {
  const portfolioDir = path.join(process.cwd(), 'public', 'portfolio')
  let files: string[] = []
  
  try {
    files = fs.readdirSync(portfolioDir).filter(file => 
      file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg') || file.endsWith('.webp')
    )
  } catch (e) {
    console.error('Directory not found', e)
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center mb-16 space-y-4">
          <Badge variant="secondary" className="px-3 py-1 text-sm">Design & Direção de Arte</Badge>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">Portfólio Criativo</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Uma seleção de trabalhos, flyers, posts e artes criativas desenvolvidas por Willian.
          </p>
        </div>

        <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
          {files.map((file, index) => (
            <div key={index} className="break-inside-avoid relative group rounded-xl overflow-hidden border bg-card shadow-sm transition-all hover:shadow-xl">
              <Image 
                src={\/portfolio/\\}
                alt={\Arte \\}
                width={800}
                height={800}
                className="w-full object-cover transition-transform duration-500 group-hover:scale-105"
                unoptimized
              />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center p-4">
                <p className="text-white text-center font-medium drop-shadow-md px-2 truncate">
                  {file.replace(/\.[^/.]+$/, "")}
                </p>
              </div>
            </div>
          ))}
        </div>
        
        {files.length === 0 && (
          <div className="text-center py-20 text-muted-foreground">
            Nenhuma arte encontrada na pasta do portfólio.
          </div>
        )}
      </div>
    </div>
  )
}
