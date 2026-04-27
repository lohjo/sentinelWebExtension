import { useEffect } from 'react';

type Event = MouseEvent | TouchEvent;

export function useClickOutside(
  refs: React.RefObject<any>[],
  handler: (event: Event) => void,
) {
  useEffect(() => {
    const listener = (event: Event) => {
      // If any ref contains the event target, do nothing
      if (
        refs.some(
          (ref) => ref.current && ref.current.contains(event.target as Node),
        )
      ) {
        return;
      }
      handler(event);
    };

    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);

    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refs, handler]);
}
