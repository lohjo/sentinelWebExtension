import { describe, it, expect } from 'vitest';
import {
  isChatDomain,
  getChatPlatformFromHostname,
} from '../types';

describe('chat-scrapers types', () => {
  describe('getChatPlatformFromHostname', () => {
    it('returns Facebook for facebook.com', () => {
      expect(getChatPlatformFromHostname('facebook.com')).toBe('Facebook');
    });

    it('returns Facebook for www.facebook.com', () => {
      expect(getChatPlatformFromHostname('www.facebook.com')).toBe('Facebook');
    });

    it('returns Facebook for m.facebook.com', () => {
      expect(getChatPlatformFromHostname('m.facebook.com')).toBe('Facebook');
    });

    it('returns Messenger for messenger.com', () => {
      expect(getChatPlatformFromHostname('messenger.com')).toBe('Messenger');
    });

    it('returns Telegram for web.telegram.org', () => {
      expect(getChatPlatformFromHostname('web.telegram.org')).toBe('Telegram');
    });

    it('returns WhatsApp for web.whatsapp.com', () => {
      expect(getChatPlatformFromHostname('web.whatsapp.com')).toBe('WhatsApp');
    });

    it('returns null for google.com', () => {
      expect(getChatPlatformFromHostname('google.com')).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(getChatPlatformFromHostname('')).toBeNull();
    });
  });

  describe('isChatDomain', () => {
    it('returns true for facebook.com', () => {
      expect(isChatDomain('facebook.com')).toBe(true);
    });

    it('returns true for web.whatsapp.com', () => {
      expect(isChatDomain('web.whatsapp.com')).toBe(true);
    });

    it('returns false for example.com', () => {
      expect(isChatDomain('example.com')).toBe(false);
    });
  });
});
