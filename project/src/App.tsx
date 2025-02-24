import React, { useState, useRef } from 'react';
import { Upload, Download, Lock, Unlock, Key } from 'lucide-react';

function App() {
  const [message, setMessage] = useState('');
  const [secretCode, setSecretCode] = useState('');
  const [decodeSecretCode, setDecodeSecretCode] = useState('');
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [encodedImage, setEncodedImage] = useState<string | null>(null);
  const [decodedMessage, setDecodedMessage] = useState('');
  const [error, setError] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const encryptMessage = (text: string, code: string): string => {
    return text.split('').map((char, i) => {
      const shift = code.charCodeAt(i % code.length);
      return String.fromCharCode(char.charCodeAt(0) ^ shift);
    }).join('');
  };

  const hideMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!originalImage || !message || !secretCode) return;

    const encryptedMessage = encryptMessage(message, secretCode);

    const img = new Image();
    img.src = originalImage;
    await new Promise(resolve => img.onload = resolve);

    const canvas = canvasRef.current!;
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    const binaryMessage = encryptedMessage.split('')
      .map(char => char.charCodeAt(0).toString(2).padStart(8, '0'))
      .join('') + '00000000';

    let bitIndex = 0;
    for (let i = 0; i < data.length && bitIndex < binaryMessage.length; i += 4) {
      if (bitIndex < binaryMessage.length) {
        data[i] = (data[i] & 254) | parseInt(binaryMessage[bitIndex]);
        bitIndex++;
      }
    }

    ctx.putImageData(imageData, 0, 0);
    setEncodedImage(canvas.toDataURL());
    setError('');
  };

  const handleDecodeImage = async (file: File) => {
    if (!decodeSecretCode) {
      setError('Please enter the secret code first');
      return;
    }

    const img = new Image();
    img.src = URL.createObjectURL(file);
    await new Promise(resolve => img.onload = resolve);

    const canvas = canvasRef.current!;
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    let binaryMessage = '';
    for (let i = 0; i < data.length; i += 4) {
      binaryMessage += data[i] & 1;
    }

    let message = '';
    for (let i = 0; i < binaryMessage.length; i += 8) {
      const byte = binaryMessage.substr(i, 8);
      const charCode = parseInt(byte, 2);
      if (charCode === 0) break;
      message += String.fromCharCode(charCode);
    }

    try {
      const decryptedMessage = encryptMessage(message, decodeSecretCode);
      if (decryptedMessage.trim() === '') {
        throw new Error('No hidden message found');
      }
      setDecodedMessage(decryptedMessage);
      setError('');
    } catch (err) {
      setError('Invalid secret code or no hidden message found');
      setDecodedMessage('');
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setOriginalImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">Image Steganography Tool</h1>
        
        <div className="grid md:grid-cols-2 gap-8">
          {/* Encode Section */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Hide Message
            </h2>
            
            <form onSubmit={hideMessage} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Upload Image</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="imageUpload"
                  />
                  <label htmlFor="imageUpload" className="cursor-pointer">
                    <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-500">Click to upload or drag and drop</p>
                  </label>
                </div>
              </div>

              {originalImage && (
                <div>
                  <img src={originalImage} alt="Original" className="max-h-48 mx-auto" />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">Secret Message</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full p-2 border rounded-md"
                  rows={4}
                  placeholder="Enter your secret message..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <Key className="w-4 h-4" />
                  Secret Code
                </label>
                <input
                  type="password"
                  value={secretCode}
                  onChange={(e) => setSecretCode(e.target.value)}
                  className="w-full p-2 border rounded-md"
                  placeholder="Enter secret code to encrypt message"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
                disabled={!originalImage || !message || !secretCode}
              >
                Hide Message
              </button>
            </form>

            {encodedImage && (
              <div className="mt-4">
                <h3 className="text-sm font-medium mb-2">Encoded Image</h3>
                <img src={encodedImage} alt="Encoded" className="max-h-48 mx-auto" />
                <a
                  href={encodedImage}
                  download="encoded_image.png"
                  className="block w-full text-center mt-2 text-blue-600 hover:text-blue-800"
                >
                  Download Image
                </a>
              </div>
            )}
          </div>

          {/* Decode Section */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Unlock className="w-5 h-5" />
              Reveal Message
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <Key className="w-4 h-4" />
                  Secret Code
                </label>
                <input
                  type="password"
                  value={decodeSecretCode}
                  onChange={(e) => setDecodeSecretCode(e.target.value)}
                  className="w-full p-2 border rounded-md"
                  placeholder="Enter secret code to decrypt message"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Upload Encoded Image</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleDecodeImage(file);
                    }}
                    className="hidden"
                    id="decodeUpload"
                  />
                  <label htmlFor="decodeUpload" className="cursor-pointer">
                    <Download className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-500">Upload image to decode</p>
                  </label>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-100 text-red-700 rounded-md">
                  {error}
                </div>
              )}

              {decodedMessage && (
                <div>
                  <h3 className="text-sm font-medium mb-2">Decoded Message</h3>
                  <div className="p-4 bg-gray-50 rounded-md">
                    <p className="whitespace-pre-wrap">{decodedMessage}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>
    </div>
  );
}

export default App;