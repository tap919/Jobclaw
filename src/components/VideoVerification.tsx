import React, { useRef, useState, useEffect } from 'react';

interface VideoVerificationProps {
  onVerificationComplete: (videoUrl: string, idPhotoUrl: string) => void;
  currentVerificationStatus: 'pending' | 'verified' | 'flagged' | 'audited';
}

const VideoVerification: React.FC<VideoVerificationProps> = ({ onVerificationComplete, currentVerificationStatus }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [recording, setRecording] = useState(false);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [idPhoto, setIdPhoto] = useState<File | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = true; // Mute local video playback
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const startCamera = async () => {
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("Could not access camera. Please ensure it's enabled and grant permissions.");
    }
  };

  const startRecording = () => {
    if (stream) {
      const options = { mimeType: 'video/webm' };
      const recordedChunks: Blob[] = [];
      const mediaRecorder = new MediaRecorder(stream, options);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: 'video/webm' });
        setVideoBlob(blob);
        setRecording(false);
        stream.getTracks().forEach(track => track.stop()); // Stop camera after recording
        setStream(null);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setRecording(true);
    } else {
      setError("Camera not started. Please start the camera before recording.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
    }
  };

  const handleIdPhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setIdPhoto(event.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!videoBlob || !idPhoto) {
      setError("Please record your video and upload an ID photo.");
      return;
    }

    // In a real application, you would upload these files to a server
    // For now, we'll simulate the upload with dummy URLs
    const dummyVideoUrl = URL.createObjectURL(videoBlob);
    const dummyIdPhotoUrl = URL.createObjectURL(idPhoto);

    onVerificationComplete(dummyVideoUrl, dummyIdPhotoUrl);
    setError(null);
    alert("Verification data submitted! (Simulated upload)"); // For demonstration
  };

  return (
    <div className="p-4 border rounded-lg shadow-sm bg-white">
      <h3 className="text-lg font-semibold mb-3">Video Identity Verification</h3>
      {currentVerificationStatus === 'verified' && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Verified!</strong>
          <span className="block sm:inline ml-2">Your identity has been successfully verified.</span>
        </div>
      )}
      {currentVerificationStatus === 'pending' && (
        <>
          {error && <div className="text-red-500 mb-3">{error}</div>}
          <div className="mb-4">
            <video ref={videoRef} autoPlay playsInline controls={false} className="w-full h-64 bg-gray-200 rounded-md"></video>
          </div>
          <div className="flex justify-center space-x-2 mb-4">
            {!stream && (
              <button onClick={startCamera} className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">
                Start Camera
              </button>
            )}
            {stream && !recording && (
              <button onClick={startRecording} className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600">
                Start Recording
              </button>
            )}
            {recording && (
              <button onClick={stopRecording} className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600">
                Stop Recording
              </button>
            )}
            {videoBlob && !recording && (
              <a href={URL.createObjectURL(videoBlob)} download="verification_video.webm" className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600">
                Download Video
              </a>
            )}
          </div>
          <div className="mb-4">
            <label htmlFor="idPhoto" className="block text-sm font-medium text-gray-700 mb-1">
              Upload ID Photo (Passport, Driver's License)
            </label>
            <input
              type="file"
              id="idPhoto"
              accept="image/*"
              onChange={handleIdPhotoChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {idPhoto && <p className="text-sm text-gray-500 mt-1">Selected: {idPhoto.name}</p>}
          </div>
          <button
            onClick={handleSubmit}
            disabled={!videoBlob || !idPhoto || recording}
            className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Submit for Verification
          </button>
        </>
      )}
    </div>
  );
};

export default VideoVerification;
