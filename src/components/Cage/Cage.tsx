'use client'

import { useEffect, useState } from "react";
import styles from "./Cage.module.css"

type CageProps = {
	color: "red" | "black";
}

export function Cage() {

  return (
		<div className={styles.cage}>
			
		</div>
  )
}