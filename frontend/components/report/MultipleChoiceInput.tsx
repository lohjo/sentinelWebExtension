import Image from 'next/image';
import styles from './multiplechoiceinput.module.css';
import { useRef, useState } from 'react';
import { useClickOutside } from './useClickOutside';

export default function MultipleChoiceInput({
  title,
  data,
  selectedOption,
  onInput,
  iconUrl,
  placeholder,
  required = false,
}: {
  title: string;
  data: { label: string; value: string }[];
  selectedOption: { label: string; value: string };
  onInput: (option: { label: string; value: string }) => void;
  iconUrl?: string;
  placeholder?: string;
  required?: boolean;
}) {
  const [showDropdown, setShowDropdown] = useState(false);

  const selectContainerRef = useRef<HTMLDivElement>(null); // Clickable area that toggles the dropdown
  const dropdownContainerRef = useRef<HTMLDivElement>(null); // Dropdown menu container

  function handleToggleDropdown() {
    setShowDropdown((prev) => !prev);
  }

  function handleSelectOption(option: { label: string; value: string }) {
    onInput(option);
    setShowDropdown(false);
  }

  // Custom hook to close dropdown when clicked outside
  useClickOutside([dropdownContainerRef, selectContainerRef], () => {
    setShowDropdown(false);
  });

  return (
    <div className={styles.container}>
      <div className={styles.titleSection}>
        {iconUrl && <Image src={iconUrl} alt='icon' width={20} height={20} />}
        <span className={styles.title}>{title}</span>
        {required && <span style={{ color: 'red' }}>*</span>}
      </div>
      <div className={styles.inputSection}>
        <div
          ref={selectContainerRef}
          className={styles.selectContainer}
          onClick={handleToggleDropdown}
        >
          {selectedOption?.label ? (
            <span>{selectedOption?.label}</span>
          ) : (
            <span className={styles.placeholder}>{placeholder}</span>
          )}
          <div className={styles.rightTriangle} />
        </div>
        {showDropdown && (
          <div ref={dropdownContainerRef} className={styles.dropdownContainer}>
            {data.map((option) => (
              <div
                key={`dropdown-${option.label}`}
                onClick={() => handleSelectOption(option)}
                className={`${styles.dropdownOption} ${
                  selectedOption === option ? styles.selected : ''
                }`}
              >
                {option.label}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
