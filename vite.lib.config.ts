import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: './src/index.ts',
      formats: ['es', 'cjs'],
      fileName: (format) => (format === 'cjs' ? 'index.cjs' : 'index.js'),
      cssFileName: 'style'
    },
    rollupOptions: {
      external: ['react', 'react-dom', '@xyflow/react'],
      output: { globals: { react: 'React', 'react-dom': 'ReactDOM', '@xyflow/react': 'XYFlow' } }
    }
  }
});
