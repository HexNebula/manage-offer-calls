import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff } from 'lucide-react';
import logo from '../assets/Nplus-one-logo-1.png';
import { useAuth } from '../hooks/useAuth.js';
import Button from '../components/ui/Button.jsx';
import Input from '../components/ui/Input.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();

  const onSubmit = async ({ email, password }) => {
    setServerError('');
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      const detail =
        err?.response?.data?.detail ||
        err?.response?.data?.non_field_errors?.[0] ||
        'Identifiants invalides. Veuillez réessayer.';
      setServerError(detail);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-navy-dark to-brand-navy flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo above card on dark background */}
        <div className="flex flex-col items-center mb-6">
          <img src={logo} alt="N+ONE Datacenters" className="h-16 w-auto object-contain mb-2" />
          <p className="text-sm text-blue-200">Gestion des Appels d'Offres</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl px-8 py-10">

          {/* Error banner */}
          {serverError && (
            <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-700">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <Input
              label="Adresse e-mail"
              type="email"
              autoComplete="email"
              required
              error={errors.email?.message}
              {...register('email', {
                required: "L'adresse e-mail est requise",
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: 'Adresse e-mail invalide',
                },
              })}
            />

            <div className="relative">
              <Input
                label="Mot de passe"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                error={errors.password?.message}
                {...register('password', {
                  required: 'Le mot de passe est requis',
                })}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-[34px] text-gray-400 hover:text-gray-600"
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <Button
              type="submit"
              className="w-full mt-2"
              size="lg"
              isLoading={isSubmitting}
            >
              Se connecter
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-500 mt-6">
          &copy; {new Date().getFullYear()} N+ONE Datacenters — Casablanca
        </p>
      </div>
    </div>
  );
}
