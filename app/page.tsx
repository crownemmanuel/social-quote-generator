'use client';

import { useState, useRef, useEffect } from 'react';
import smartcrop from 'smartcrop';

interface QuoteInput {
  id: string;
  text: string;
  highlightedWord: string;
  imageUrl: string | null;
}

interface GeneratedQuote {
  id: string;
  text: string;
  highlightedWord: string;
  imageUrl: string;
  image: HTMLImageElement;
  cropData?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export default function Home() {
  const [artistName, setArtistName] = useState('');
  const [highlightColor, setHighlightColor] = useState('#FF8C00');
  const [quoteInputs, setQuoteInputs] = useState<QuoteInput[]>([
    { id: '1', text: '', highlightedWord: '', imageUrl: null }
  ]);
  const [generatedQuotes, setGeneratedQuotes] = useState<GeneratedQuote[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const canvasRefs = useRef<{ [key: string]: HTMLCanvasElement | null }>({});

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedArtistName = localStorage.getItem('artistName');
    const savedHighlightColor = localStorage.getItem('highlightColor');
    
    if (savedArtistName) {
      setArtistName(savedArtistName);
    }
    if (savedHighlightColor) {
      setHighlightColor(savedHighlightColor);
    }
  }, []);

  // Save artist name to localStorage when it changes
  const handleArtistNameChange = (name: string) => {
    setArtistName(name);
    localStorage.setItem('artistName', name);
  };

  // Save highlight color to localStorage when it changes
  const handleHighlightColorChange = (color: string) => {
    setHighlightColor(color);
    localStorage.setItem('highlightColor', color);
  };

  const handleImageUpload = async (quoteId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      let fileToRead = file;

      // Check if the file is HEIC/HEIF format (including sequence variants and empty-type fallback)
      const lowerName = file.name.toLowerCase();
      const isHEIC =
        /image\/(heic|heif|heic-sequence|heif-sequence)/.test(file.type) ||
        /\.heic$/.test(lowerName) ||
        /\.heif$/.test(lowerName);

      if (isHEIC) {
        try {
          // Dynamically import heic2any (browser-only library)
          console.log('Converting HEIC image to JPEG...');
          const heic2anyModule = await import('heic2any');
          // Support both CJS and ESM default exports across bundlers
          const heic2any: any = (heic2anyModule as any).default || (heic2anyModule as any);
          
          const convertedBlob = await heic2any({
            blob: file,
            toType: 'image/jpeg',
            quality: 0.9,
            multiple: true, // handle HEIC sequences/live-photos by returning Blob[]
          });

          // heic2any can return Blob or Blob[], handle both cases
          const blob: Blob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
          fileToRead = new File([blob], file.name.replace(/\.heic$/i, '.jpg'), {
            type: 'image/jpeg',
          });
          console.log('HEIC conversion successful!');
        } catch (heicError) {
          console.error('HEIC conversion failed:', heicError);
          // Extract readable message from various error shapes
          const asAny: any = heicError as any;
          let message: string | undefined;
          if (asAny?.message && typeof asAny.message === 'string') {
            message = asAny.message;
          } else if (asAny?.message?.message) {
            message = String(asAny.message.message);
          } else if (asAny?.code && asAny?.message) {
            message = `${asAny.code}: ${String(asAny.message)}`;
          } else if (asAny?.type === 'error' && asAny?.error?.message) {
            message = String(asAny.error.message);
          } else if (asAny?.filename) {
            message = `Worker error in ${asAny.filename}:${asAny.lineno || ''} ${asAny.message || ''}`;
          } else {
            try {
              message = JSON.stringify(asAny);
            } catch {
              message = String(asAny);
            }
          }
          alert(`Failed to convert HEIC image.\nReason: ${message}\nPlease try converting to JPEG manually or use a different image.`);
          return;
        }
      }

      // Read the file (original or converted)
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageUrl = event.target?.result as string;
        setQuoteInputs(prev => prev.map(q => 
          q.id === quoteId ? { ...q, imageUrl } : q
        ));
      };
      reader.readAsDataURL(fileToRead);
    } catch (error) {
      console.error('Error processing image:', error);
      alert('Failed to process image. Please try a different file.');
    }
  };

  const updateQuoteInput = (quoteId: string, field: keyof QuoteInput, value: string) => {
    setQuoteInputs(prev => prev.map(q => 
      q.id === quoteId ? { ...q, [field]: value } : q
    ));
  };

  const addNewQuoteInput = () => {
    const newId = Date.now().toString();
    setQuoteInputs(prev => [...prev, { id: newId, text: '', highlightedWord: '', imageUrl: null }]);
  };

  const removeQuoteInput = (quoteId: string) => {
    if (quoteInputs.length > 1) {
      setQuoteInputs(prev => prev.filter(q => q.id !== quoteId));
    }
  };

  const generateAllQuotes = async () => {
    // Validate all inputs
    const validInputs = quoteInputs.filter(q => q.text && q.imageUrl);
    if (validInputs.length === 0) {
      alert('Please add at least one quote with both text and an image');
      return;
    }

    setIsGenerating(true);
    const newGeneratedQuotes: GeneratedQuote[] = [];

    for (const input of validInputs) {
      try {
        const quote = await processQuoteInput(input);
        newGeneratedQuotes.push(quote);
      } catch (error) {
        console.error(`Failed to generate quote ${input.id}:`, error);
      }
    }

    setGeneratedQuotes(newGeneratedQuotes);
    setIsGenerating(false);
  };

  const processQuoteInput = (input: QuoteInput): Promise<GeneratedQuote> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = async () => {
        try {
          // Use smartcrop to find the best crop area
          const result = await smartcrop.crop(img, { 
            width: 1080, 
            height: 1350,
            minScale: 1.0
          });

          resolve({
            id: input.id,
            text: input.text,
            highlightedWord: input.highlightedWord,
            imageUrl: input.imageUrl!,
            image: img,
            cropData: result.topCrop,
          });
        } catch (error) {
          console.error('Smart crop failed, using center crop:', error);
          // Fallback to center crop if smartcrop fails
          resolve({
            id: input.id,
            text: input.text,
            highlightedWord: input.highlightedWord,
            imageUrl: input.imageUrl!,
            image: img,
          });
        }
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = input.imageUrl!;
    });
  };

  const drawQuoteOnCanvas = (canvas: HTMLCanvasElement, quote: GeneratedQuote) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = 1080;
    canvas.height = 1350;

    // Draw image as background using smart crop or cover positioning
    if (quote.cropData) {
      // Use smart crop data to crop the image intelligently
      ctx.drawImage(
        quote.image,
        quote.cropData.x,
        quote.cropData.y,
        quote.cropData.width,
        quote.cropData.height,
        0,
        0,
        canvas.width,
        canvas.height
      );
    } else {
      // Fallback to center crop if no smart crop data
      const imgAspect = quote.image.width / quote.image.height;
      const canvasAspect = canvas.width / canvas.height;
      let drawWidth, drawHeight, offsetX, offsetY;

      // Scale the image to cover the entire canvas
      if (imgAspect > canvasAspect) {
        // Image is wider than canvas - fit to canvas height, crop sides
        drawHeight = canvas.height;
        drawWidth = drawHeight * imgAspect;
        offsetX = (canvas.width - drawWidth) / 2;
        offsetY = 0;
      } else {
        // Image is taller than canvas - fit to canvas width, crop top/bottom
        drawWidth = canvas.width;
        drawHeight = drawWidth / imgAspect;
        offsetX = 0;
        offsetY = (canvas.height - drawHeight) / 2;
      }

      // Ensure minimum size to cover canvas completely
      if (drawWidth < canvas.width) {
        drawWidth = canvas.width;
        drawHeight = drawWidth / imgAspect;
        offsetX = 0;
        offsetY = (canvas.height - drawHeight) / 2;
      }
      if (drawHeight < canvas.height) {
        drawHeight = canvas.height;
        drawWidth = drawHeight * imgAspect;
        offsetX = (canvas.width - drawWidth) / 2;
        offsetY = 0;
      }

      ctx.drawImage(quote.image, offsetX, offsetY, drawWidth, drawHeight);
    }

    // Add gradient overlay (black at bottom 70% coverage to transparent at top)
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');      // Transparent at top
    gradient.addColorStop(0.3, 'rgba(0, 0, 0, 0)');    // Start gradient at 30%
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.85)');   // Dark at bottom
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Calculate text layout first to know where to place quote marks
    const words = quote.text.toUpperCase().split(' ');
    const centerX = canvas.width / 2;
    const lineHeight = 90;
    const maxWidth = 900;
    const bottomPadding = 200; // Space from bottom for artist name
    
    ctx.font = 'bold 70px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Calculate all lines first
    const lines: string[] = [];
    let currentLine = '';

    words.forEach((word) => {
      const testLine = currentLine + word + ' ';
      const metrics = ctx.measureText(testLine);
      
      if (metrics.width > maxWidth && currentLine !== '') {
        lines.push(currentLine.trim());
        currentLine = word + ' ';
      } else {
        currentLine = testLine;
      }
    });
    if (currentLine !== '') {
      lines.push(currentLine.trim());
    }

    // Calculate starting Y position (text at bottom)
    const totalTextHeight = lines.length * lineHeight;
    let startY = canvas.height - bottomPadding - totalTextHeight;

    // Draw opening quotation mark aligned with the start of the first text line
    if (lines.length > 0) {
      // Determine the left x of the first line
      const firstLineText = lines[0];
      const firstLineWidth = ctx.measureText(firstLineText).width;
      const firstLineX = centerX - (firstLineWidth / 2);
      const firstLineY = startY; // Using 'middle' baseline, this is vertical center of the line

      // Use a thinner, typographic opening quote
      const openingQuote = '“';
      ctx.font = '300 110px "Times New Roman", Georgia, serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'left';

      const quoteWidth = ctx.measureText(openingQuote).width;
      const quoteGap = 16; // gap between quote mark and first character
      const quoteX = firstLineX - quoteGap - quoteWidth;
      const quoteY = firstLineY; // vertically centered with the first line

      ctx.fillText(openingQuote, quoteX, quoteY);
    }

    // Draw quote text lines
    ctx.font = 'bold 70px Arial, sans-serif';
    ctx.textAlign = 'center';
    
    lines.forEach((line, lineIndex) => {
      const lineWords = line.split(' ');
      const y = startY + (lineIndex * lineHeight);
      
      // Calculate total width of line to position words
      const lineWidth = ctx.measureText(line).width;
      let lineX = centerX - (lineWidth / 2);
      
      lineWords.forEach((lineWord) => {
        if (lineWord === quote.highlightedWord.toUpperCase()) {
          ctx.fillStyle = highlightColor;
        } else {
          ctx.fillStyle = '#ffffff';
        }
        
        const wordWidth = ctx.measureText(lineWord).width;
        const spaceWidth = ctx.measureText(' ').width;
        
        ctx.textAlign = 'left';
        ctx.fillText(lineWord, lineX, y);
        lineX += wordWidth + spaceWidth;
      });
    });

    // Draw artist name at the bottom
    ctx.font = '36px Arial, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(artistName.toUpperCase(), centerX, canvas.height - 100);
  };

  const downloadImage = (quoteId: string, index: number) => {
    const canvas = canvasRefs.current[quoteId];
    if (!canvas) return;

    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `quote-${index + 1}.png`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
      }
    });
  };

  const downloadAllImages = () => {
    generatedQuotes.forEach((quote, index) => {
      setTimeout(() => {
        downloadImage(quote.id, index);
      }, index * 500); // Stagger downloads by 500ms
    });
  };

  useEffect(() => {
    generatedQuotes.forEach((quote) => {
      const canvas = canvasRefs.current[quote.id];
      if (canvas && quote.image.complete) {
        drawQuoteOnCanvas(canvas, quote);
      }
    });
  }, [generatedQuotes, artistName, highlightColor]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center">Social Qoute Generator</h1>

        {/* Settings Section */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8 shadow-xl">
          <h2 className="text-2xl font-semibold mb-4">Global Settings</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Artist Name (appears on all quotes)
              </label>
              <input
                type="text"
                value={artistName}
                onChange={(e) => handleArtistNameChange(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter artist name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Highlight Color (for emphasized words)
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="color"
                  value={highlightColor}
                  onChange={(e) => handleHighlightColorChange(e.target.value)}
                  className="h-12 w-20 bg-gray-700 border border-gray-600 rounded-lg cursor-pointer"
                />
                <input
                  type="text"
                  value={highlightColor}
                  onChange={(e) => handleHighlightColorChange(e.target.value)}
                  className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                  placeholder="#FF8C00"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Changes apply to all quotes. Settings are saved automatically.
              </p>
            </div>
          </div>
        </div>

        {/* Quote Inputs Section */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8 shadow-xl">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold">Add Quotes</h2>
            <button
              onClick={addNewQuoteInput}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg transition duration-200"
            >
              + Add New Quote
            </button>
          </div>
          
          <div className="space-y-6">
            {quoteInputs.map((quoteInput, index) => (
              <div key={quoteInput.id} className="bg-gray-700 rounded-lg p-6 relative">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Quote #{index + 1}</h3>
                  {quoteInputs.length > 1 && (
                    <button
                      onClick={() => removeQuoteInput(quoteInput.id)}
                      className="text-red-400 hover:text-red-300 font-semibold"
                    >
                      ✕ Remove
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Upload Image
                    </label>
                    <input
                      type="file"
                      accept="image/*,.heic,.heif"
                      onChange={(e) => handleImageUpload(quoteInput.id, e)}
                      className="w-full px-4 py-2 bg-gray-600 border border-gray-500 rounded-lg file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                    />
                    {quoteInput.imageUrl && (
                      <img
                        src={quoteInput.imageUrl}
                        alt="Preview"
                        className="mt-4 max-h-40 rounded-lg"
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Quote Text
                    </label>
                    <textarea
                      value={quoteInput.text}
                      onChange={(e) => updateQuoteInput(quoteInput.id, 'text', e.target.value)}
                      rows={3}
                      className="w-full px-4 py-2 bg-gray-600 border border-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter your quote text..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Word to Highlight (optional)
                    </label>
                    <input
                      type="text"
                      value={quoteInput.highlightedWord}
                      onChange={(e) => updateQuoteInput(quoteInput.id, 'highlightedWord', e.target.value)}
                      className="w-full px-4 py-2 bg-gray-600 border border-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter word to highlight"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={generateAllQuotes}
            disabled={isGenerating}
            className="w-full mt-6 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-semibold py-3 rounded-lg transition duration-200"
          >
            {isGenerating ? 'Generating...' : 'Generate All Quotes'}
          </button>
        </div>

        {/* Generated Quotes Section */}
        {generatedQuotes.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-6 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold">Generated Quotes ({generatedQuotes.length})</h2>
              <button
                onClick={downloadAllImages}
                className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-6 py-2 rounded-lg transition duration-200"
              >
                📥 Download All
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {generatedQuotes.map((quote, index) => (
                <div key={quote.id} className="bg-gray-700 rounded-lg p-4">
                  <canvas
                    ref={(el) => {
                      canvasRefs.current[quote.id] = el;
                      if (el && quote.image.complete) {
                        drawQuoteOnCanvas(el, quote);
                      }
                    }}
                    className="w-full rounded-lg mb-4"
                  />
                  <button
                    onClick={() => downloadImage(quote.id, index)}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-lg transition duration-200"
                  >
                    Download Quote #{index + 1}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

