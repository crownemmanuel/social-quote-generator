'use client';

import { useState, useRef, useEffect } from 'react';
import smartcrop from 'smartcrop';

interface QuoteInput {
  id: string;
  text: string;
  highlightedWord: string;
  imageUrl: string | null;
  textPosition: 'top' | 'bottom';
  fontSize?: number; // Optional per-quote font size override
  gradientStart?: number; // Optional per-quote gradient start position (0-1, default 0.5)
}

interface GeneratedQuote {
  id: string;
  text: string;
  highlightedWord: string;
  imageUrl: string;
  image: HTMLImageElement;
  textPosition: 'top' | 'bottom';
  fontSize?: number; // Optional per-quote font size override
  gradientStart?: number; // Optional per-quote gradient start position (0-1, default 0.5)
  cropData?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

// Font options for social media quotes
const FONT_OPTIONS = [
  { name: 'Montserrat', value: 'Montserrat', family: '"Montserrat", sans-serif', weights: '400;700;900' },
  { name: 'Playfair Display', value: 'Playfair Display', family: '"Playfair Display", serif', weights: '400;700;900' },
  { name: 'Oswald', value: 'Oswald', family: '"Oswald", sans-serif', weights: '400;600;700' },
  { name: 'Raleway', value: 'Raleway', family: '"Raleway", sans-serif', weights: '400;600;700;800' },
  { name: 'Bebas Neue', value: 'Bebas Neue', family: '"Bebas Neue", sans-serif', weights: '400' },
  { name: 'Poppins', value: 'Poppins', family: '"Poppins", sans-serif', weights: '400;600;700;800' },
  { name: 'Lato', value: 'Lato', family: '"Lato", sans-serif', weights: '400;700;900' },
  { name: 'Roboto', value: 'Roboto', family: '"Roboto", sans-serif', weights: '400;700;900' },
  { name: 'Inter', value: 'Inter', family: '"Inter", sans-serif', weights: '400;600;700;800' },
  { name: 'Barlow', value: 'Barlow', family: '"Barlow", sans-serif', weights: '400;600;700;900' },
  { name: 'Arial', value: 'Arial', family: 'Arial, sans-serif', weights: '' },
];

export default function Home() {
  const [artistName, setArtistName] = useState('');
  const [highlightColor, setHighlightColor] = useState('#FF8C00');
  const [selectedFont, setSelectedFont] = useState('Oswald');
  const [fontSize, setFontSize] = useState(70);
  const [quoteInputs, setQuoteInputs] = useState<QuoteInput[]>([
    { id: '1', text: '', highlightedWord: '', imageUrl: null, textPosition: 'bottom' }
  ]);
  const [generatedQuotes, setGeneratedQuotes] = useState<GeneratedQuote[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const canvasRefs = useRef<{ [key: string]: HTMLCanvasElement | null }>({});
  const isInitialLoad = useRef(true);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedArtistName = localStorage.getItem('artistName');
    const savedHighlightColor = localStorage.getItem('highlightColor');
    const savedFont = localStorage.getItem('selectedFont');
    const savedFontSize = localStorage.getItem('fontSize');
    const savedQuoteInputs = localStorage.getItem('quoteInputs');
    
    if (savedArtistName) {
      setArtistName(savedArtistName);
    }
    if (savedHighlightColor) {
      setHighlightColor(savedHighlightColor);
    }
    if (savedFont) {
      setSelectedFont(savedFont);
    }
    if (savedFontSize) {
      setFontSize(parseInt(savedFontSize, 10));
    }
    if (savedQuoteInputs) {
      try {
        const parsed = JSON.parse(savedQuoteInputs);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setQuoteInputs(parsed);
        }
      } catch (error) {
        console.error('Failed to parse saved quote inputs:', error);
      }
    }
    
    // Mark initial load as complete after a short delay to ensure state is set
    setTimeout(() => {
      isInitialLoad.current = false;
    }, 100);
  }, []);

  // Save quoteInputs to localStorage whenever they change (but not during initial load)
  useEffect(() => {
    if (!isInitialLoad.current && quoteInputs.length > 0) {
      try {
        localStorage.setItem('quoteInputs', JSON.stringify(quoteInputs));
      } catch (error) {
        console.error('Failed to save quote inputs to localStorage:', error);
        // If localStorage is full, try to clear old data or notify user
        if (error instanceof DOMException && error.code === 22) {
          alert('Storage is full. Please clear some data or use fewer images.');
        }
      }
    }
  }, [quoteInputs]);

  // Load Google Fonts dynamically
  useEffect(() => {
    const fontOption = FONT_OPTIONS.find(f => f.value === selectedFont);
    if (fontOption && fontOption.weights) {
      const fontFamily = fontOption.value.replace(/\s+/g, '+');
      const weights = fontOption.weights.replace(/;/g, ',');
      const linkId = `google-font-${fontOption.value}`;
      
      // Remove existing font link if any
      const existingLink = document.getElementById(linkId);
      if (existingLink) {
        existingLink.remove();
      }
      
      // Add new font link
      const link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?family=${fontFamily}:wght@${weights}&display=swap`;
      document.head.appendChild(link);
    }
  }, [selectedFont]);

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

  // Save font to localStorage when it changes
  const handleFontChange = (font: string) => {
    setSelectedFont(font);
    localStorage.setItem('selectedFont', font);
  };

  // Save font size to localStorage when it changes
  const handleFontSizeChange = (size: number) => {
    setFontSize(size);
    localStorage.setItem('fontSize', size.toString());
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
          // Attempt server-side fallback using /api/convert with sharp
          try {
            const form = new FormData();
            form.append('file', file);
            const res = await fetch('/api/convert', { method: 'POST', body: form });
            if (!res.ok) {
              const text = await res.text();
              throw new Error(text || `Server conversion failed with ${res.status}`);
            }
            const blob = await res.blob();
            fileToRead = new File([blob], file.name.replace(/\.heic$/i, '.jpg'), {
              type: 'image/jpeg',
            });
            console.log('Server-side HEIC conversion successful!');
          } catch (serverErr) {
            const serverMsg = serverErr instanceof Error ? serverErr.message : String(serverErr);
            alert(`Failed to convert HEIC image.\nReason: ${message}\nServer fallback: ${serverMsg}\nPlease try converting to JPEG manually or use a different image.`);
            return;
          }
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

  const updateQuoteInput = (quoteId: string, field: keyof QuoteInput, value: string | number) => {
    setQuoteInputs(prev => prev.map(q => 
      q.id === quoteId ? { ...q, [field]: value } : q
    ));
  };

  const updateQuoteFontSize = (quoteId: string, size: number | undefined) => {
    setQuoteInputs(prev => prev.map(q => 
      q.id === quoteId ? { ...q, fontSize: size } : q
    ));
  };

  const updateQuoteGradientStart = (quoteId: string, start: number | undefined) => {
    setQuoteInputs(prev => prev.map(q => 
      q.id === quoteId ? { ...q, gradientStart: start } : q
    ));
  };

  const addNewQuoteInput = () => {
    const newId = Date.now().toString();
    setQuoteInputs(prev => [...prev, { id: newId, text: '', highlightedWord: '', imageUrl: null, textPosition: 'bottom' }]);
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
            textPosition: input.textPosition,
            fontSize: input.fontSize,
            gradientStart: input.gradientStart,
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
            textPosition: input.textPosition,
            fontSize: input.fontSize,
            gradientStart: input.gradientStart,
          });
        }
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = input.imageUrl!;
    });
  };

  // Helper function to normalize words for comparison (removes punctuation, trims, uppercases)
  const normalizeWord = (word: string): string => {
    if (!word || typeof word !== 'string') return '';
    // Trim first, then remove punctuation, then uppercase
    return word
      .trim() // Remove leading/trailing whitespace first
      .replace(/[^\w]/g, '') // Remove all punctuation and special characters (keep only letters, numbers, underscore)
      .toUpperCase(); // Convert to uppercase for case-insensitive comparison
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

    // Add gradient overlay based on text position
    // Use per-quote gradientStart if available, otherwise default to 0.5 (50%)
    const gradientStartPosition = quote.gradientStart !== undefined ? quote.gradientStart : 0.5;
    
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    if (quote.textPosition === 'top') {
      // Dark at top, transparent at bottom (for top text)
      gradient.addColorStop(0, 'rgba(0, 0, 0, 0.85)');   // Dark at top
      gradient.addColorStop(gradientStartPosition, 'rgba(0, 0, 0, 0)');   // Start fading at gradientStartPosition
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');      // Transparent at bottom
    } else {
      // Transparent at top, dark at bottom (for bottom text - default)
      gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');      // Transparent at top
      gradient.addColorStop(gradientStartPosition, 'rgba(0, 0, 0, 0)');    // Start gradient at gradientStartPosition
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0.85)');   // Dark at bottom
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Use per-quote font size if available, otherwise use global font size
    const effectiveFontSize = quote.fontSize || fontSize;
    
    // Calculate text layout first to know where to place quote marks
    const words = quote.text.toUpperCase().split(' ');
    const centerX = canvas.width / 2;
    const lineHeight = effectiveFontSize * 1.3; // Proportional to font size
    const maxWidth = 900;
    const bottomPadding = 200; // Space from bottom for artist name
    
    // Get selected font family
    const fontOption = FONT_OPTIONS.find(f => f.value === selectedFont);
    const fontFamily = fontOption ? fontOption.family : 'Arial, sans-serif';
    
    ctx.font = `bold ${effectiveFontSize}px ${fontFamily}`;
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

    // Calculate starting Y position based on text position
    const totalTextHeight = lines.length * lineHeight;
    const topPadding = 200; // Space from top for artist name when text is at top
    let startY: number;
    
    if (quote.textPosition === 'top') {
      // Text starts from top
      startY = topPadding + (lineHeight / 2);
    } else {
      // Text at bottom (default)
      startY = canvas.height - bottomPadding - totalTextHeight;
    }

    // Draw opening quotation mark aligned with the start of the first text line
    if (lines.length > 0) {
      // Determine the left x of the first line
      const firstLineText = lines[0];
      const firstLineWidth = ctx.measureText(firstLineText).width;
      const firstLineX = centerX - (firstLineWidth / 2);
      const firstLineY = startY; // Using 'middle' baseline, this is vertical center of the line

      // Use a thinner, typographic opening quote (proportional to font size)
      const openingQuote = '“';
      const quoteMarkSize = effectiveFontSize * 1.57; // Proportional to font size (~110px for 70px font)
      ctx.font = `300 ${quoteMarkSize}px "Times New Roman", Georgia, serif`;
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'left';

      const quoteWidth = ctx.measureText(openingQuote).width;
      const quoteGap = 16; // gap between quote mark and first character
      const quoteX = firstLineX - quoteGap - quoteWidth;
      const quoteY = firstLineY; // vertically centered with the first line

      ctx.fillText(openingQuote, quoteX, quoteY);
    }

    // Draw quote text lines
    ctx.font = `bold ${effectiveFontSize}px ${fontFamily}`;
    ctx.textAlign = 'center';
    
    // Normalize the highlighted word for comparison (only if it exists)
    const normalizedHighlightedWord = quote.highlightedWord 
      ? normalizeWord(quote.highlightedWord.trim())
      : '';
    
    // Debug logging (can be removed in production)
    if (normalizedHighlightedWord) {
      console.log('Looking for highlighted word:', normalizedHighlightedWord);
    }
    
    lines.forEach((line, lineIndex) => {
      // Split by spaces and filter out empty strings (handles multiple spaces)
      const lineWords = line.split(/\s+/).filter(word => word.trim().length > 0);
      const y = startY + (lineIndex * lineHeight);
      
      // Calculate total width of line to position words
      const lineWidth = ctx.measureText(line).width;
      let lineX = centerX - (lineWidth / 2);
      
      lineWords.forEach((lineWord) => {
        // Normalize the word from the line and compare with normalized highlighted word
        const normalizedLineWord = normalizeWord(lineWord);
        
        // Debug logging for first word (can be removed in production)
        if (normalizedHighlightedWord && lineIndex === 0 && lineWords.indexOf(lineWord) === 0) {
          console.log('Comparing:', normalizedLineWord, '===', normalizedHighlightedWord, '?', normalizedLineWord === normalizedHighlightedWord);
        }
        
        const shouldHighlight = normalizedHighlightedWord && 
                               normalizedHighlightedWord.length > 0 &&
                               normalizedLineWord.length > 0 &&
                               normalizedLineWord === normalizedHighlightedWord;
        
        if (shouldHighlight) {
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

    // Draw artist name - opposite side of text position
    ctx.font = '36px Arial, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    const artistNameY = quote.textPosition === 'top' 
      ? canvas.height - 100  // At bottom when text is at top
      : canvas.height - 100;  // At bottom when text is at bottom (default)
    ctx.fillText(artistName.toUpperCase(), centerX, artistNameY);
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

  const clearAllAndStartNew = () => {
    if (confirm('Are you sure you want to clear all data and start fresh? This will remove all saved quotes and settings.')) {
      // Clear localStorage
      localStorage.clear();
      
      // Reset all state to defaults
      setArtistName('');
      setHighlightColor('#FF8C00');
      setSelectedFont('Oswald');
      setFontSize(70);
      setQuoteInputs([
        { id: Date.now().toString(), text: '', highlightedWord: '', imageUrl: null, textPosition: 'bottom' }
      ]);
      setGeneratedQuotes([]);
    }
  };

  useEffect(() => {
    generatedQuotes.forEach((quote) => {
      const canvas = canvasRefs.current[quote.id];
      if (canvas && quote.image.complete) {
        drawQuoteOnCanvas(canvas, quote);
      }
    });
  }, [generatedQuotes, artistName, highlightColor, selectedFont, fontSize]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center">Social Qoute Generator</h1>

        {/* Settings Section */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8 shadow-xl">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold">Global Settings</h2>
            <button
              onClick={clearAllAndStartNew}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded-lg transition duration-200 text-sm"
            >
              🗑️ Clear All & Start New
            </button>
          </div>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Font Family (for quote text)
                </label>
                <select
                  value={selectedFont}
                  onChange={(e) => handleFontChange(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  style={{ fontFamily: FONT_OPTIONS.find(f => f.value === selectedFont)?.family || 'Arial, sans-serif' }}
                >
                  {FONT_OPTIONS.map((font) => (
                    <option key={font.value} value={font.value} style={{ fontFamily: font.family }}>
                      {font.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium mb-2">
                Font Size: {fontSize}px
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="40"
                  max="120"
                  value={fontSize}
                  onChange={(e) => handleFontSizeChange(parseInt(e.target.value, 10))}
                  className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <input
                  type="number"
                  min="40"
                  max="120"
                  value={fontSize}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val) && val >= 40 && val <= 120) {
                      handleFontSizeChange(val);
                    }
                  }}
                  className="w-24 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Adjust the font size for your quote text (40px - 120px)
              </p>
            </div>
            {/* Font Preview */}
            <div className="mt-4 p-4 bg-gray-900 rounded-lg border border-gray-700">
              <p className="text-xs text-gray-400 mb-2">Preview:</p>
              <div
                className="text-white font-bold uppercase leading-tight"
                style={{ 
                  fontFamily: FONT_OPTIONS.find(f => f.value === selectedFont)?.family || 'Arial, sans-serif',
                  fontSize: `${fontSize}px`
                }}
              >
                Sample Quote Text
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span
                  className="font-bold uppercase"
                  style={{ 
                    fontFamily: FONT_OPTIONS.find(f => f.value === selectedFont)?.family || 'Arial, sans-serif',
                    color: highlightColor,
                    fontSize: `${fontSize * 0.8}px`
                  }}
                >
                  Highlighted
                </span>
                <span
                  className="font-bold uppercase text-white"
                  style={{ 
                    fontFamily: FONT_OPTIONS.find(f => f.value === selectedFont)?.family || 'Arial, sans-serif',
                    fontSize: `${fontSize * 0.8}px`
                  }}
                >
                  Word
                </span>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Changes apply to all quotes. Settings are saved automatically.
            </p>
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
                      onChange={(e) => updateQuoteInput(quoteInput.id, 'highlightedWord', e.target.value.trim())}
                      className="w-full px-4 py-2 bg-gray-600 border border-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter word to highlight (punctuation ignored)"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Enter the word as it appears in your quote. Punctuation and case are ignored for matching.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Text Position
                    </label>
                    <select
                      value={quoteInput.textPosition}
                      onChange={(e) => updateQuoteInput(quoteInput.id, 'textPosition', e.target.value as 'top' | 'bottom')}
                      className="w-full px-4 py-2 bg-gray-600 border border-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="bottom">Bottom (Default)</option>
                      <option value="top">Top</option>
                    </select>
                    <p className="text-xs text-gray-400 mt-1">
                      {quoteInput.textPosition === 'top' 
                        ? 'Text will appear at the top with gradient fading downward'
                        : 'Text will appear at the bottom with gradient fading upward'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Font Size Override (optional)
                    </label>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min="40"
                        max="120"
                        value={quoteInput.fontSize || fontSize}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          updateQuoteFontSize(quoteInput.id, val === fontSize ? undefined : val);
                        }}
                        className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                      <input
                        type="number"
                        min="40"
                        max="120"
                        value={quoteInput.fontSize || fontSize}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val) && val >= 40 && val <= 120) {
                            updateQuoteFontSize(quoteInput.id, val === fontSize ? undefined : val);
                          }
                        }}
                        className="w-24 px-4 py-2 bg-gray-600 border border-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center"
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {quoteInput.fontSize 
                        ? `Using custom size: ${quoteInput.fontSize}px (global default: ${fontSize}px)`
                        : `Using global default: ${fontSize}px`}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Gradient Transparency Start (optional)
                    </label>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={(quoteInput.gradientStart !== undefined ? quoteInput.gradientStart : 0.5) * 100}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) / 100;
                          updateQuoteGradientStart(quoteInput.id, val === 0.5 ? undefined : val);
                        }}
                        className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="5"
                        value={Math.round((quoteInput.gradientStart !== undefined ? quoteInput.gradientStart : 0.5) * 100)}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) / 100;
                          if (!isNaN(val) && val >= 0 && val <= 1) {
                            updateQuoteGradientStart(quoteInput.id, val === 0.5 ? undefined : val);
                          }
                        }}
                        className="w-24 px-4 py-2 bg-gray-600 border border-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center"
                      />
                      <span className="text-sm text-gray-400 w-8">%</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {quoteInput.gradientStart !== undefined
                        ? `Gradient starts at ${Math.round(quoteInput.gradientStart * 100)}% (default: 50%)`
                        : `Using default: 50% - Gradient starts fading at 50% from ${quoteInput.textPosition === 'top' ? 'top' : 'bottom'}`}
                    </p>
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

