'use client'

import { useEffect, useState } from "react";
import styles from "./Field.module.css"
import { Cage } from "../Cage/Cage";

export function Field() {

  return (
		<div className={styles.field}>
			<Cage color="red">
				
			</Cage>
			<Cage color="black">

			</Cage>
    </div>
  )
}