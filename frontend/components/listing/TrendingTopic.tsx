import Image from 'next/image';
import styles from './trendingtopic.module.css';

export default function TrendingTopic({
  title,
  imgUrl,
  susCount,
  onClick,
}: {
  title: string;
  imgUrl: string;
  susCount: number;
  onClick: () => void;
}) {
  return (
    <div className={styles.container} onClick={onClick}>
      <Image
        className={styles.bgImg}
        src={imgUrl}
        alt='trend'
        width={100}
        height={100}
      />
      <div className={styles.mask} />
      <div className={styles.infoSection}>
        <span className={styles.title}>{title}</span>
        <span className={styles.susCount}>
          <span>{susCount}</span> suspicious reports
        </span>
      </div>
    </div>
  );
}
