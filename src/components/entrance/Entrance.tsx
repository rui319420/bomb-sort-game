import styles from "./Entrance.module.css";

type EntranceProps = { position?: "top" | "bottom" };

export function Entrance({ position = "top" }: EntranceProps) {
  return (
    <div className={`${styles.entrance} ${styles[position]}`} aria-hidden="true">
      {position === "top" ? "↓ IN ↓" : "↑ IN ↑"}
    </div>
  );
}
