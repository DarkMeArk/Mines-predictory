# APK File Placeholder

The actual APK file (mines_predictor_v1.0.0.apk) should be placed in this directory when deploying.

Download the APK file from the original source and place it here with the filename:
`mines_predictor_v1.0.0.apk`

# Mines Predictor for bet939.bet

A prediction tool for the Mines game on bet939.bet, with both web and Android implementations.

## Features

- **Web Application**:
  - Mines game prediction
  - Probability analysis
  - Provably fair verification
  - Android app download

- **Android Application**:
  - Overlay interface
  - Automatic seed extraction
  - Stealth operation

## Deployment

This application can be easily deployed to Render.com's free tier:

1. Push this repository to GitHub
2. Sign up at Render.com
3. Create a new Web Service linked to this repository
4. Use the following settings:
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `gunicorn main:app`
5. Deploy the service

## Local Development

1. Clone the repository
2. Install dependencies: `pip install -r requirements.txt`
3. Run the application: `python main.py`
4. Access at http://localhost:5000

## Android App

The Android APK is available at `/download-android-apk` once the service is deployed.

## License

Private use only. Not for redistribution.
