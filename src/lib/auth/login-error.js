/** Map Auth failures without exposing upstream details or blaming credentials for outages. */
export function getLoginError(error) {
  if (error.code === 'invalid_credentials') {
    return { error: 'Email atau password salah.', status: 401 };
  }

  if (error.status === 429) {
    return { error: 'Terlalu banyak percobaan login. Tunggu sebentar lalu coba lagi.', status: 429 };
  }

  if (error.code === 'email_not_confirmed') {
    return { error: 'Email akun belum dikonfirmasi. Hubungi tim Nived.', status: 403 };
  }

  if (error.name === 'AuthRetryableFetchError' || error.status === 0 || error.status >= 500) {
    return {
      error: 'Tidak dapat terhubung ke layanan login. Coba lagi sebentar atau hubungi tim Nived.',
      status: 503,
    };
  }

  return { error: 'Login belum berhasil. Hubungi tim Nived jika masalah berlanjut.', status: 502 };
}
