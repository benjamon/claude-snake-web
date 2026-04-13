import { useState, useRef, useEffect } from 'react';

export default function SetupScreen({ onContinue }) {
  const [name, setName] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleSubmit(e) {
    e?.preventDefault();
    const trimmed = name.trim();
    if (trimmed) onContinue(trimmed);
  }

  return (
    <div className="overlay">
      <form className="overlay__content" onSubmit={handleSubmit}>
        <h1 className="title">SNAKE</h1>
        <p className="subtitle">Enter your name</p>
        <input
          ref={inputRef}
          className="input-field"
          type="text"
          maxLength={16}
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Your name..."
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck="false"
        />
        <button
          type="submit"
          className={`btn btn--primary btn--full${!name.trim() ? ' btn--disabled' : ''}`}
        >
          CONTINUE &#9654;
        </button>
      </form>
    </div>
  );
}
