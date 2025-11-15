import styles from './BackgroundBlobs.module.css';

export function BackgroundBlobs() {
  return (
    <>
      <div className={styles.backgroundGradient}></div>
      <div className={`${styles.blob} ${styles.blob1}`}></div>
      <div className={`${styles.blob} ${styles.blob2}`}></div>
      <div className={`${styles.blob} ${styles.blob3}`}></div>
      <div className={`${styles.blob} ${styles.blob4}`}></div>
      <div className={`${styles.blob} ${styles.blob5}`}></div>
      <div className={`${styles.blob} ${styles.blob6}`}></div>
      <div className={`${styles.blob} ${styles.blob7}`}></div>
      <div className={`${styles.blob} ${styles.blob8}`}></div>
      <div className={`${styles.blob} ${styles.blob9}`}></div>
    </>
  );
}
