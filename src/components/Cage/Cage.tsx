import styles from "./Cage.module.css";

type CageProps = { color: "red" | "black" };

export function Cage({ color }: CageProps) {
  return (
    <div className={`${styles.cage} ${styles[color]}`}>
      <span className={styles.symbol} aria-hidden="true">{color === "red" ? "◆" : "●"}</span>
      <strong>{color === "red" ? "RED" : "BLACK"}</strong>
      <span>{color === "red" ? "赤いボムはこちら" : "黒いボムはこちら"}</span>
    </div>
  );
}
