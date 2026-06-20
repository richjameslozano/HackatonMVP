import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateCredentials, warnIfPlaceholder } from '../credential-store';
import type { Credentials } from '../credential-store';

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('credential-store', () => {
  describe('validateCredentials', () => {
    it('should return true for real credential values', () => {
      const creds: Credentials = {
        appId: 'cli_a91865699678de19',
        appSecret: 'uXHJs2ELAT7QhXGwHW0RFet6CahLnl2k',
        baseAppToken: 'PyPSbWKVpakTg5s0uEujZ24fpaf',
      };
      expect(validateCredentials(creds)).toBe(true);
    });

    it('should return false when appId is a placeholder', () => {
      const creds: Credentials = {
        appId: 'your_app_id_here',
        appSecret: 'real_secret',
        baseAppToken: 'real_token',
      };
      expect(validateCredentials(creds)).toBe(false);
    });

    it('should return false when appSecret is a placeholder', () => {
      const creds: Credentials = {
        appId: 'cli_real_id',
        appSecret: 'YOUR_LARK_APP_SECRET',
        baseAppToken: 'real_token',
      };
      expect(validateCredentials(creds)).toBe(false);
    });

    it('should return false when baseAppToken is a placeholder', () => {
      const creds: Credentials = {
        appId: 'cli_real_id',
        appSecret: 'real_secret',
        baseAppToken: 'placeholder_token',
      };
      expect(validateCredentials(creds)).toBe(false);
    });

    it('should detect REPLACE_ME pattern', () => {
      const creds: Credentials = {
        appId: 'REPLACE_ME',
        appSecret: 'real_secret',
        baseAppToken: 'real_token',
      };
      expect(validateCredentials(creds)).toBe(false);
    });

    it('should detect xxx pattern', () => {
      const creds: Credentials = {
        appId: 'xxx',
        appSecret: 'real_secret',
        baseAppToken: 'real_token',
      };
      expect(validateCredentials(creds)).toBe(false);
    });

    it('should detect TODO pattern', () => {
      const creds: Credentials = {
        appId: 'TODO_fill_in',
        appSecret: 'real_secret',
        baseAppToken: 'real_token',
      };
      expect(validateCredentials(creds)).toBe(false);
    });

    it('should be case-insensitive for placeholder detection', () => {
      const creds: Credentials = {
        appId: 'Your_App_Id_Here',
        appSecret: 'real_secret',
        baseAppToken: 'real_token',
      };
      expect(validateCredentials(creds)).toBe(false);
    });
  });

  describe('warnIfPlaceholder', () => {
    let warnSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
      warnSpy.mockRestore();
    });

    it('should not warn for valid credentials', () => {
      const creds: Credentials = {
        appId: 'cli_a91865699678de19',
        appSecret: 'uXHJs2ELAT7QhXGwHW0RFet6CahLnl2k',
        baseAppToken: 'PyPSbWKVpakTg5s0uEujZ24fpaf',
      };
      warnIfPlaceholder(creds);
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('should warn for each placeholder credential', () => {
      const creds: Credentials = {
        appId: 'your_app_id_here',
        appSecret: 'YOUR_LARK_APP_SECRET',
        baseAppToken: 'your_token_here',
      };
      warnIfPlaceholder(creds);
      expect(warnSpy).toHaveBeenCalledTimes(3);
    });

    it('should warn only for the placeholder fields', () => {
      const creds: Credentials = {
        appId: 'your_app_id_here',
        appSecret: 'real_secret_value',
        baseAppToken: 'real_token_value',
      };
      warnIfPlaceholder(creds);
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('VITE_LARK_APP_ID'),
      );
    });

    it('should include the variable name in the warning message', () => {
      const creds: Credentials = {
        appId: 'real_id',
        appSecret: 'placeholder_value',
        baseAppToken: 'real_token',
      };
      warnIfPlaceholder(creds);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('VITE_LARK_APP_SECRET'),
      );
    });
  });
});
