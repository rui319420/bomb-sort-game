'use client'

import styles from "./Cage.module.css"

type CageProps = {
  color: "red" | "black"; 
}

export function Cage({ color }: CageProps) {

  return (
    <div 
      className={styles.cage} 
      style={{ backgroundColor: color }}
    >
      
    </div>
  )
}