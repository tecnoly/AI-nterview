import os
import sys
import speech_recognition as sr
from dotenv import load_dotenv
from PyQt6.QtWidgets import QApplication, QWidget, QVBoxLayout, QPushButton, QTextEdit, QLabel
from PyQt6.QtCore import Qt

# Load environment variables
load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

class SpeechRecognitionApp(QWidget):
    def __init__(self):
        super().__init__()

        # Initialize speech recognizer
        self.recognizer = sr.Recognizer()
        self.microfone = sr.Microphone()
        self.stop_listening = None

        # Set up the UI
        self.initUI()

    def initUI(self):
        self.setWindowTitle('Speech Recognition with Whisper API')

        # Layout
        layout = QVBoxLayout()

        # Buttons
        self.start_btn = QPushButton('Start Listening', self)
        self.start_btn.clicked.connect(self.start_listening)
        self.start_btn.setShortcut('Ctrl+S')
        
        self.stop_btn = QPushButton('Stop Listening', self)
        self.stop_btn.clicked.connect(self.stop_listening_fn)
        self.stop_btn.setShortcut('Ctrl+T')

        # Text edit to display results
        self.result_display = QTextEdit(self)
        self.result_display.setReadOnly(False)

        # Status label
        self.status_label = QLabel("Status: Ready", self)

        # Add widgets to layout
        layout.addWidget(self.start_btn)
        layout.addWidget(self.stop_btn)
        layout.addWidget(self.result_display)
        layout.addWidget(self.status_label)

        # Set the layout for the main window
        self.setLayout(layout)

    def callback(self, recognizer, audio):
        try:
            print("I'm in the callback!")
            result = recognizer.recognize_whisper_api(audio, api_key=OPENAI_API_KEY)
            self.result_display.append(f"Whisper API thinks you said: {result}")
        except sr.RequestError as e:
            self.result_display.append(f"Could not request results from Whisper API; {e}")

    def start_listening(self):
        self.status_label.setText("Status: Listening...")
        with self.microfone as source:
            self.recognizer.adjust_for_ambient_noise(source)
        self.stop_listening = self.recognizer.listen_in_background(self.microfone, self.callback)

    def stop_listening_fn(self):
        if self.stop_listening:
            self.stop_listening(wait_for_stop=False)
            self.status_label.setText("Status: Stopped Listening")

def main():
    app = QApplication(sys.argv)
    ex = SpeechRecognitionApp()
    ex.show()
    sys.exit(app.exec())

if __name__ == '__main__':
    main()
