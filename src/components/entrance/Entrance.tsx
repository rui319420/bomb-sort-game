'use client'

import styles from "./Entrance.module.css"

type EntranceProps = {
  position?: "top" | "bottom";
}

export function Entrance({ position = "top" }: EntranceProps) {
  return (
    <div 
      className={styles.entrance}
      style={{
        top: position === "top" ? 0 : "auto",
        bottom: position === "bottom" ? 0 : "auto",
      }}
    >
      ENTRANCE
    </div>
  )
}