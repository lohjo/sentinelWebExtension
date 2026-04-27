import Image from 'next/image';
import styles from './areatextinput.module.css';

export default function AreaTextInput({
  title,
  onInput,
  iconUrl,
  placeholder,
  required = false,
  minHeight = '200px',
}: {
  title: string;
  onInput: (url: string) => void;
  iconUrl?: string;
  placeholder?: string;
  required?: boolean;
  minHeight?: string;
}) {
  return (
    <div className={styles.container}>
      <div className={styles.titleSection}>
        {iconUrl && <Image src={iconUrl} alt='icon' width={20} height={20} />}
        <span className={styles.title}>{title}</span>
        {required && <span style={{ color: 'red' }}>*</span>}
      </div>
      <div className={styles.inputSection}>
        <textarea
          style={{ minHeight }}
          onChange={(e) => onInput(e.target.value)}
          placeholder={placeholder}
        />
      </div>
    </div>
  );
}
