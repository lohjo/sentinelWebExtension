'use client';

import Image from 'next/image';
import styles from './searchbar.module.css';

export default function Searchbar({
  text,
  onInput,
}: {
  text: string;
  onInput: (query: string) => void;
}) {
  return (
    <div className={styles.container}>
      <div className={styles.inputSection}>
        <Image
          src='/search_gray.svg'
          alt='search'
          width={16}
          height={16}
          className={styles.inputIcon}
        />
        <input
          onChange={(e) => onInput(e.target.value)}
          type='text'
          value={text}
          placeholder='Search and debut relevant fake information...'
        />
      </div>
    </div>
  );
}
