# Build configuration for production deployment

# Build the application
npm run build

# Verify build directory exists
ls -la dist/

# Copy additional files if needed
cp README.md dist/
cp .env.example dist/

# Validate the build
npm run preview &
sleep 5
curl -f http://localhost:4173 || exit 1
pkill -f "npm run preview"

echo "Build completed successfully!"
echo "Ready for deployment to static hosting (Vercel, Netlify, etc.)"