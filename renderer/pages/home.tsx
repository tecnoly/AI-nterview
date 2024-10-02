import React from 'react'
import Head from 'next/head'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react';
const MicRecorder = require('mic-recorder-to-mp3');

export default function HomePage() {
  const [ base64Data, setBase64Data ] = useState('');
  const [ screenshotPrompt, setScreenshotPrompt ] = useState('');
  const [ audioCapturePrompt, setAudioCapturePrompt ] = useState('');
  const [ response, setResponse ] = useState('');
  const [ fileName, setFileName ] = useState(null);
  const [ capturingAudio, setCapturingAudio ] = useState(false);
  const openAiKeyRef = useRef('');
  const mediaRecorderRef = useRef<any | null>(null);
  const audioSrcRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    // Listen for the screenshot-taken event
    window.ipc.on('screenshot-taken', async (data) => {
      setBase64Data(data as any);
      await aiForScreenshots(data as any);
    });

    // Listen for the start-audio-capture event
    window.ipc.on('start-audio-capture', (_) => {
      startCapture();
    });
    
    // Listen for the stop-audio-capture event
    window.ipc.on('stop-audio-capture', (_) => {
      stopCapture();
    });

    // Get prompt from local storage
    const screenshotPrompt = localStorage.getItem('screenshotPrompt');
    if (screenshotPrompt) {
      setScreenshotPrompt(screenshotPrompt);
    }

    const audioCapturePrompt = localStorage.getItem('audioCapturePrompt');
    if (audioCapturePrompt) {
      setAudioCapturePrompt(audioCapturePrompt);
    }

    const storedFile = localStorage.getItem('uploadedFile');
    if (storedFile) {
      setFileName(JSON.parse(storedFile).name);
    }

    const storedOpenAiKey = localStorage.getItem('openAiKey');
    if (storedOpenAiKey) {
      console.log('Setting OpenAI key:', storedOpenAiKey);
      openAiKeyRef.current = storedOpenAiKey;
    }
  }, [
    setBase64Data, 
    setScreenshotPrompt,
    setAudioCapturePrompt,
    setFileName,
    setCapturingAudio,
  ]);


  useEffect(() => {
    textareaRef.current.style.height = "1020px";
    const scrollHeight = textareaRef.current.scrollHeight;
    textareaRef.current.style.height = scrollHeight + "px";
    textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
  }, [response]);

  const startCapture = async () => {
    try {
      console.log('Starting audio capture');
      const recorder = new MicRecorder({
        bitRate: 128
      });

      mediaRecorderRef.current = recorder;
      await mediaRecorderRef.current.start();
      setCapturingAudio(true);
    } catch (error) {
      console.error('Error capturing audio:', error);
    }
  };

  const stopCapture = () => {
    setCapturingAudio(false);
    console.log('Stopping audio capture');

    if (mediaRecorderRef.current) {
      mediaRecorderRef.current
        .stop()
        .getMp3()
        .then(([buffer, blob]) => {
            const file = new File(buffer, 'interview.mp3', {
                type: blob.type,
                lastModified: Date.now(),
            });
            audioSrcRef.current.src = URL.createObjectURL(file);
            // Prepare form data
            const formData = new FormData();
            formData.append('file', file);
            formData.append('model', 'whisper-1');

            // Send POST request to OpenAI Whisper API
            (async () => {
              try {
                console.log('Sending audio to OpenAI');
                const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${openAiKeyRef.current}`,
                  },
                  body: formData,
                });

                // Handle the response
                const data = await response.json();

                console.log('OpenAI response:', data);

                await aiForAudioCapture(data.text);
              } catch (error) {
                console.error('Error sending audio to OpenAI:', error);
              }
            })();
        })
        .catch((e) => {
          console.error('Error capturing audio:', e);
        });
    }
  };

  const saveScreenshotPrompt = (value: string) => {
    setScreenshotPrompt(value);
    localStorage.setItem('screenshotPrompt', value);
  }

  const saveAudioCapturePrompt = (value: string) => {
    setAudioCapturePrompt(value);
    localStorage.setItem('audioCapturePrompt', value);
  }

  const saveOpenAiKey = (value: string) => {
    openAiKeyRef.current = value;
    localStorage.setItem('openAiKey', value);
  }

  const handleButtonClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setFileName(file.name);
      const fileData = {
        name: file.name,
        type: file.type,
        data: URL.createObjectURL(file), // For demonstration; this does not store file content
      };
      localStorage.setItem('uploadedFile', JSON.stringify(fileData));
    }
  };

  const aiForScreenshots = async (image: string) => {
    console.log('Asking OpenAI');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openAiKeyRef.current}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: screenshotPrompt
          },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:image/png;base64,${image}`,
                },
              }
            ],
          },
        ]
      }),
    });

    // Handle the response
    const data = await response.json();
    console.log('OpenAI response:', data);
    setResponse(data.choices[0].message.content);
  };

  const aiForAudioCapture = async (transcript) => {
    console.log('Transcript', transcript);
    console.log('Asking OpenAI');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openAiKeyRef.current}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: audioCapturePrompt
          },
          {
            role: "user",
            content: transcript
          },
        ]
      }),
    });

    // Handle the response
    const data = await response.json();
    console.log('OpenAI response:', data);
    setResponse(data.choices[0].message.content);
  };

  return (
    <React.Fragment>
      <Head>
        <title>ainterview</title>
      </Head>
      <main className='cursor-default grid grid-cols-2 gap-4 text-2xl w-full h-dvh text-center'>
        <div className="flex flex-col justify-items-center">
          <div className="flex flex-row">
            <input type="text" 
              className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-300 focus:ring-blue-800 border-gray-700 bg-gray-800 cursor-default"
              placeholder="Enter OpenAI API Key"
              value={openAiKeyRef.current}
              onChange={(e) => saveOpenAiKey(e.target.value)}
              />
          </div>
          <div className="flex flex-row">
            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            {/* Custom button to trigger file input */}
            <button onClick={handleButtonClick} type="button" className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-blue-800 cursor-default" >
              Upload File
            </button>
            {fileName && <p>Selected file: {fileName}</p>}
          </div>

          <p>Press F9 to take a screenshot</p>
          <h2>Screenshot:</h2>
          {base64Data && (
            <Image
              className="ml-auto mr-auto"
              src={`data:image/png;base64,${base64Data}`}
              alt="Logo image"
              width={500}
              height={500}
            />
          ) || (
              <p className="h-[210px]">No screenshot taken</p>
            )}
          <h2>Screenshot Prompt:</h2>
          <textarea className="w-full h-64 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-300 focus:ring-blue-800 border-gray-700 bg-gray-800 cursor-default" placeholder="Enter prompt here" value={screenshotPrompt} onChange={(e) => saveScreenshotPrompt(e.target.value)} />
          <h2>Audio Capture</h2>
          <div className="flex flex-row mx-auto mt-2">
            <button onClick={startCapture} disabled={capturingAudio} type="button" className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-blue-800 cursor-default disabled:bg-gray-700">
              Start Audio Capture
            </button>
            <button onClick={stopCapture} disabled={!capturingAudio} type="button" className="text-white bg-red-700 hover:bg-red-800 focus:ring-4 focus:ring-red-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-red-800 cursor-default disabled:bg-gray-700">
              Stop Audio Capture
            </button>
          </div>
          <div className="flex flex-row mx-auto">
            <audio controls className="mx-auto" ref={audioSrcRef}/>
          </div>
          <h2>Audio Capture Prompt:</h2>
          <textarea className="w-full h-64 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-300 focus:ring-blue-800 border-gray-700 bg-gray-800 cursor-default" placeholder="Enter prompt here" value={audioCapturePrompt} onChange={(e) => saveAudioCapturePrompt(e.target.value)} />
        </div>

        <div className="w-full h-dvh">
          {/* Read-only response */}
          <textarea ref={textareaRef} className="w-full max-h-dvh border border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-300 focus:ring-blue-800 border-gray-700 bg-gray-800 overflow-y-auto cursor-default" readOnly value={response} />
        </div>
      </main>
    </React.Fragment>
  )
}
