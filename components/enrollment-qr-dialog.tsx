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
          aria-label="关闭二维码"
        >
          <X aria-hidden="true" />
        </button>

        <section className="enrollment-dialog-copy">
          <span className="enrollment-dialog-index">加入方式 / 01</span>
          <div>
            <p className="enrollment-dialog-kicker">AgentAlpha 社群通行证</p>
            <h2 id="enrollment-dialog-title">从一次扫码，<br />开始做出真实作品。</h2>
            <p id="enrollment-dialog-description">
              扫码备注“训练营”，说说你的背景和想做的方向。我们主要带着学习和做项目——先聊清楚你想做什么，再一起决定从哪一步上手。
            </p>
          </div>
          <ol className="enrollment-dialog-steps">
            <li><span>01</span>打开微信扫一扫</li>
            <li><span>02</span>加微信，备注“训练营”</li>
            <li><span>03</span>说说你想做的方向</li>
          </ol>
        </section>

        <section className="enrollment-dialog-pass" aria-label="AgentAlpha 社群二维码">
          <div className="enrollment-dialog-pass-head">
            <span>AGENTALPHA</span>
            <ArrowUpRight aria-hidden="true" />
          </div>
          <div className="enrollment-dialog-qr">
            {/* The QR may be managed from the existing admin, so keep a normal img here. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrSrc} alt="AgentAlpha 社群微信二维码" />
            <span className="enrollment-dialog-scan" aria-hidden="true" />
          </div>
          <div className="enrollment-dialog-pass-foot">
            <ScanLine aria-hidden="true" />
            <div><strong>微信扫码</strong><span>二维码用于社群沟通</span></div>
          </div>
        </section>
      </div>
    </dialog>
  )
}
