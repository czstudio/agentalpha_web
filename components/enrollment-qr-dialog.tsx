"use client"

import { useEffect, useRef } from "react"
import { ArrowUpRight, ScanLine, X } from "lucide-react"

export function EnrollmentQrDialog({
  open,
  onClose,
  qrSrc,
}: {
  open: boolean
  onClose: () => void
  qrSrc: string
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (open && !dialog.open) {
      dialog.showModal()
      document.documentElement.classList.add("enrollment-dialog-open")
      window.requestAnimationFrame(() => closeButtonRef.current?.focus())
    } else if (!open && dialog.open) {
      dialog.close()
    }

    return () => document.documentElement.classList.remove("enrollment-dialog-open")
  }, [open])

  const dismiss = () => {
    dialogRef.current?.close()
    document.documentElement.classList.remove("enrollment-dialog-open")
    onClose()
  }

  return (
    <dialog
      ref={dialogRef}
      className="enrollment-dialog"
      aria-labelledby="enrollment-dialog-title"
      aria-describedby="enrollment-dialog-description"
      onCancel={(event) => {
        event.preventDefault()
        dismiss()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) dismiss()
      }}
    >
      <div className="enrollment-dialog-sheet">
        <button
          ref={closeButtonRef}
          type="button"
          className="enrollment-dialog-close"
          onClick={dismiss}
          aria-label="关闭报名二维码"
        >
          <X aria-hidden="true" />
        </button>

        <section className="enrollment-dialog-copy">
          <span className="enrollment-dialog-index">ADMISSION / 01</span>
          <div>
            <p className="enrollment-dialog-kicker">训练营报名通行证</p>
            <h2 id="enrollment-dialog-title">从一次扫码，<br />开始做出真实作品。</h2>
            <p id="enrollment-dialog-description">
              添加课程顾问时备注“训练营”，并简单说明你的背景、基础和目标，我们会据此提供适合的学习建议。
            </p>
          </div>
          <ol className="enrollment-dialog-steps">
            <li><span>01</span>打开微信扫一扫</li>
            <li><span>02</span>添加顾问并备注“训练营”</li>
            <li><span>03</span>发送背景、基础与目标</li>
          </ol>
        </section>

        <section className="enrollment-dialog-pass" aria-label="训练营报名二维码">
          <div className="enrollment-dialog-pass-head">
            <span>AGENTALPHA</span>
            <ArrowUpRight aria-hidden="true" />
          </div>
          <div className="enrollment-dialog-qr">
            {/* The QR may be managed from the existing admin, so keep a normal img here. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrSrc} alt="AgentAlpha 训练营报名微信二维码" />
            <span className="enrollment-dialog-scan" aria-hidden="true" />
          </div>
          <div className="enrollment-dialog-pass-foot">
            <ScanLine aria-hidden="true" />
            <div><strong>微信扫码</strong><span>二维码仅用于报名沟通</span></div>
          </div>
        </section>
      </div>
    </dialog>
  )
}
