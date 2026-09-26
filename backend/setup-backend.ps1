# Backend setup script for Codeyoung availability engine

# Create directory structure
New-Item -ItemType Directory -Path "src\db", "src\models", "src\services", "src\routes" -Force

# Create tsconfig.json
@"
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
"@ | Out-File -FilePath "tsconfig.json" -Encoding utf8

# Create vitest.config.ts
@"
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    testTimeout: 10000,
  },
});
"@ | Out-File -FilePath "vitest.config.ts" -Encoding utf8

Write-Host "Backend structure created successfully"
