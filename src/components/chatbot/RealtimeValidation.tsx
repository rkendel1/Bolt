'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, XCircle, Info, Loader } from 'lucide-react';

interface ValidationResult {
  type: 'success' | 'warning' | 'error' | 'info';
  message: string;
  suggestion?: string;
  action?: {
    label: string;
    handler: () => void;
  };
}

interface RealtimeValidationProps {
  input: string;
  onValidationResult?: (result: ValidationResult | null) => void;
  className?: string;
}

export default function RealtimeValidation({
  input,
  onValidationResult,
  className = ''
}: RealtimeValidationProps) {
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    if (input.trim().length < 3) {
      setValidation(null);
      onValidationResult?.(null);
      return;
    }

    const validateInput = async () => {
      setIsValidating(true);
      
      try {
        const result = await performValidation(input);
        setValidation(result);
        onValidationResult?.(result);
      } catch (error) {
        console.error('Validation error:', error);
      } finally {
        setIsValidating(false);
      }
    };

    // Debounce validation
    const timeoutId = setTimeout(validateInput, 500);
    return () => clearTimeout(timeoutId);
  }, [input, onValidationResult]);

  const performValidation = async (text: string): Promise<ValidationResult | null> => {
    const lowerText = text.toLowerCase();
    
    // Command validation patterns
    const validationRules = [
      {
        pattern: /stripe\.customers\.create\s*\(/,
        check: () => checkStripeCustomerCreation(text),
      },
      {
        pattern: /stripe\.subscriptions\.create\s*\(/,
        check: () => checkStripeSubscriptionCreation(text),
      },
      {
        pattern: /webhook\s+endpoint/,
        check: () => checkWebhookEndpoint(text),
      },
      {
        pattern: /api\s+key/,
        check: () => checkApiKeyUsage(text),
      },
      {
        pattern: /payment\s+method/,
        check: () => checkPaymentMethodUsage(text),
      }
    ];

    // Check for specific patterns
    for (const rule of validationRules) {
      if (rule.pattern.test(lowerText)) {
        const result = await rule.check();
        if (result) return result;
      }
    }

    // General intent validation
    return await checkGeneralIntent(text);
  };

  const checkStripeCustomerCreation = async (text: string): Promise<ValidationResult | null> => {
    const hasEmail = /email\s*[:=]\s*['"]/i.test(text);
    const hasRequiredFields = /name\s*[:=]\s*['"]/i.test(text);
    
    if (!hasEmail) {
      return {
        type: 'warning',
        message: 'Missing email field',
        suggestion: 'Customer creation requires an email address',
        action: {
          label: 'Add email field',
          handler: () => console.log('Adding email field example')
        }
      };
    }
    
    if (!hasRequiredFields) {
      return {
        type: 'info',
        message: 'Consider adding customer name',
        suggestion: 'Adding a name helps with customer identification'
      };
    }
    
    return {
      type: 'success',
      message: 'Customer creation looks good!'
    };
  };

  const checkStripeSubscriptionCreation = async (text: string): Promise<ValidationResult | null> => {
    const hasCustomer = /customer\s*[:=]/i.test(text);
    const hasPriceOrPlan = /(price|plan)\s*[:=]/i.test(text);
    
    if (!hasCustomer) {
      return {
        type: 'error',
        message: 'Missing customer parameter',
        suggestion: 'Subscriptions require a customer ID',
        action: {
          label: 'See customer creation',
          handler: () => console.log('Show customer creation example')
        }
      };
    }
    
    if (!hasPriceOrPlan) {
      return {
        type: 'error',
        message: 'Missing price or plan',
        suggestion: 'Subscriptions need a price ID or plan',
        action: {
          label: 'Browse prices',
          handler: () => console.log('Show price examples')
        }
      };
    }
    
    return {
      type: 'success',
      message: 'Subscription setup looks complete'
    };
  };

  const checkWebhookEndpoint = async (text: string): Promise<ValidationResult | null> => {
    const hasUrl = /https?:\/\//i.test(text);
    const hasEndpoint = /\/webhook/i.test(text);
    
    if (!hasUrl) {
      return {
        type: 'warning',
        message: 'Webhook needs a URL',
        suggestion: 'Provide the full HTTPS URL for your webhook endpoint'
      };
    }
    
    if (!hasEndpoint) {
      return {
        type: 'info',
        message: 'Consider using /webhook path',
        suggestion: 'Common practice is to use /webhook or /webhooks path'
      };
    }
    
    return {
      type: 'success',
      message: 'Webhook endpoint format looks good'
    };
  };

  const checkApiKeyUsage = async (text: string): Promise<ValidationResult | null> => {
    const hasSecretKey = /sk_/i.test(text);
    const hasPublishableKey = /pk_/i.test(text);
    const mentionsProduction = /(prod|production|live)/i.test(text);
    
    if (hasSecretKey && mentionsProduction) {
      return {
        type: 'error',
        message: 'Security warning!',
        suggestion: 'Never expose secret keys in production code',
        action: {
          label: 'Learn about key security',
          handler: () => console.log('Show API key security guide')
        }
      };
    }
    
    if (hasSecretKey) {
      return {
        type: 'warning',
        message: 'Secret key detected',
        suggestion: 'Ensure secret keys are stored securely (environment variables)'
      };
    }
    
    if (hasPublishableKey) {
      return {
        type: 'info',
        message: 'Using publishable key',
        suggestion: 'Publishable keys are safe for client-side use'
      };
    }
    
    return null;
  };

  const checkPaymentMethodUsage = async (text: string): Promise<ValidationResult | null> => {
    const hasSetupIntent = /setup.?intent/i.test(text);
    const hasPaymentIntent = /payment.?intent/i.test(text);
    const hasConfirmation = /confirm/i.test(text);
    
    if (hasPaymentIntent && !hasConfirmation) {
      return {
        type: 'info',
        message: 'Payment Intent created',
        suggestion: 'Remember to confirm the payment on the client side'
      };
    }
    
    if (hasSetupIntent) {
      return {
        type: 'success',
        message: 'Using Setup Intent for future payments',
        suggestion: 'Good choice for subscription setup'
      };
    }
    
    return null;
  };

  const checkGeneralIntent = async (text: string): Promise<ValidationResult | null> => {
    const lowerText = text.toLowerCase();
    
    // Check for common issues
    if (lowerText.includes('not working') || lowerText.includes('error')) {
      return {
        type: 'info',
        message: 'Troubleshooting mode',
        suggestion: 'I can help debug the issue. Please share any error messages.'
      };
    }
    
    if (lowerText.includes('best practice') || lowerText.includes('recommend')) {
      return {
        type: 'success',
        message: 'Great question about best practices!',
        suggestion: 'I\'ll provide industry-standard recommendations'
      };
    }
    
    if (lowerText.includes('tutorial') || lowerText.includes('how to')) {
      return {
        type: 'info',
        message: 'Tutorial request detected',
        suggestion: 'I can provide step-by-step guidance'
      };
    }
    
    return null;
  };

  const getValidationIcon = (type: ValidationResult['type']) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'info': return <Info className="w-4 h-4 text-blue-500" />;
      default: return null;
    }
  };

  const getValidationStyles = (type: ValidationResult['type']) => {
    switch (type) {
      case 'success': return 'border-green-200 bg-green-50 text-green-800';
      case 'warning': return 'border-yellow-200 bg-yellow-50 text-yellow-800';
      case 'error': return 'border-red-200 bg-red-50 text-red-800';
      case 'info': return 'border-blue-200 bg-blue-50 text-blue-800';
      default: return 'border-gray-200 bg-gray-50 text-gray-800';
    }
  };

  if (!validation && !isValidating) {
    return null;
  }

  return (
    <div className={`${className}`}>
      {isValidating ? (
        <div className="flex items-center space-x-2 p-2 border border-gray-200 bg-gray-50 rounded text-sm">
          <Loader className="w-4 h-4 animate-spin text-gray-400" />
          <span className="text-gray-600">Validating...</span>
        </div>
      ) : validation ? (
        <div className={`p-3 border rounded-lg text-sm ${getValidationStyles(validation.type)}`}>
          <div className="flex items-start space-x-2">
            {getValidationIcon(validation.type)}
            <div className="flex-1">
              <div className="font-medium">{validation.message}</div>
              {validation.suggestion && (
                <div className="mt-1 opacity-90">{validation.suggestion}</div>
              )}
              {validation.action && (
                <button
                  onClick={validation.action.handler}
                  className="mt-2 px-2 py-1 bg-white bg-opacity-50 rounded text-xs hover:bg-opacity-75 transition-colors"
                >
                  {validation.action.label}
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}