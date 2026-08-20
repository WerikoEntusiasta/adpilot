'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { AlertTriangle, Info, ShieldAlert } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  variant?: 'default' | 'warning' | 'destructive'
  confirmLabel?: string
  cancelLabel?: string
  requireConfirmText?: string
  requireCheckbox?: string
  onConfirm: () => void
  children?: React.ReactNode
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  variant = 'default',
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  requireConfirmText,
  requireCheckbox,
  onConfirm,
  children,
}: ConfirmationDialogProps) {
  const [confirmText, setConfirmText] = useState('')
  const [checked, setChecked] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const canConfirm =
    (!requireConfirmText || confirmText === requireConfirmText) &&
    (!requireCheckbox || checked)

  const handleConfirm = async () => {
    setIsLoading(true)
    await new Promise((r) => setTimeout(r, 500))
    onConfirm()
    setIsLoading(false)
    setConfirmText('')
    setChecked(false)
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setConfirmText('')
      setChecked(false)
    }
    onOpenChange(open)
  }

  const Icon = variant === 'destructive' ? ShieldAlert : variant === 'warning' ? AlertTriangle : Info
  const iconColor = variant === 'destructive' ? 'text-red-500' : variant === 'warning' ? 'text-amber-500' : 'text-primary'

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={cn('h-10 w-10 rounded-full flex items-center justify-center', 
              variant === 'destructive' ? 'bg-red-500/10' : variant === 'warning' ? 'bg-amber-500/10' : 'bg-primary/10'
            )}>
              <Icon className={cn('h-5 w-5', iconColor)} />
            </div>
            <DialogTitle>{title}</DialogTitle>
          </div>
          <DialogDescription className="pt-2">{description}</DialogDescription>
        </DialogHeader>

        {children}

        {requireConfirmText && (
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">
              Digite <span className="font-mono font-bold text-foreground">{requireConfirmText}</span> para confirmar:
            </Label>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={requireConfirmText}
            />
          </div>
        )}

        {requireCheckbox && (
          <div className="flex items-center space-x-2">
            <Checkbox
              id="confirm-check"
              checked={checked}
              onCheckedChange={(c) => setChecked(c === true)}
            />
            <Label htmlFor="confirm-check" className="text-sm">{requireCheckbox}</Label>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === 'destructive' ? 'destructive' : 'default'}
            onClick={handleConfirm}
            disabled={!canConfirm || isLoading}
          >
            {isLoading ? 'Processando...' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
