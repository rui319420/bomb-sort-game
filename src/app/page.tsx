import styles from "./page.module.css";
import { Field } from "../components/field/Field";

export default function BombGame() {
  return (
    <main className={styles.container}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>DRAG · SORT · SURVIVE</p>
        <h1>BOMB <span>SORT</span></h1>
        <p>爆発する前に、同じ色のエリアへ。</p>
      </header>
      <Field />
      <section className={styles.instructions} aria-label="遊び方">
        <p><span>01</span> ボムをつかむ</p>
        <p><span>02</span> 同じ色のエリアへ運ぶ</p>
        <p><span>03</span> 指を離して仕分け完了</p>
      </section>
      <p className={styles.hint}>制限時間は12秒。違う色に入れるとゲームオーバー！<br />PCではドラッグ、またはボムにカーソルを合わせて Shift キーで操作できます。</p>
    </main>
  );
}
