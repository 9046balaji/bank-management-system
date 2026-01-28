/**
 * Optimistic Card Management Hook
 * 
 * Uses React 19's useOptimistic for instant UI feedback when 
 * blocking/unblocking cards. The UI updates immediately while
 * the API call happens in the background.
 */

import { useOptimistic, useCallback, useState, useTransition, Dispatch, SetStateAction } from 'react';
import { cardApi } from '../services/api';

export type CardStatus = 'ACTIVE' | 'FROZEN' | 'BLOCKED' | 'EXPIRED';

export interface Card {
  id: number;
  user_id: number;
  account_id: number;
  card_number: string;
  card_type: 'DEBIT' | 'CREDIT' | 'VIRTUAL';
  expiry_date: string;
  cvv?: string;
  status: CardStatus;
  daily_limit: number;
  international_enabled: boolean;
  online_enabled: boolean;
  contactless_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface CardAction {
  type: 'FREEZE' | 'UNFREEZE' | 'BLOCK' | 'TOGGLE_INTERNATIONAL' | 'TOGGLE_ONLINE' | 'TOGGLE_CONTACTLESS' | 'UPDATE_LIMIT';
  cardId: number;
  payload?: any;
}

type OptimisticCardUpdate = (
  cards: Card[],
  action: CardAction
) => Card[];

const cardReducer: OptimisticCardUpdate = (cards, action) => {
  return cards.map(card => {
    if (card.id !== action.cardId) return card;
    
    switch (action.type) {
      case 'FREEZE':
        return { ...card, status: 'FROZEN' as CardStatus };
      case 'UNFREEZE':
        return { ...card, status: 'ACTIVE' as CardStatus };
      case 'BLOCK':
        return { ...card, status: 'BLOCKED' as CardStatus };
      case 'TOGGLE_INTERNATIONAL':
        return { ...card, international_enabled: !card.international_enabled };
      case 'TOGGLE_ONLINE':
        return { ...card, online_enabled: !card.online_enabled };
      case 'TOGGLE_CONTACTLESS':
        return { ...card, contactless_enabled: !card.contactless_enabled };
      case 'UPDATE_LIMIT':
        return { ...card, daily_limit: action.payload.limit };
      default:
        return card;
    }
  });
};

export interface UseOptimisticCardsResult {
  // Cards with optimistic updates applied
  cards: Card[];
  // Is a mutation in progress?
  isPending: boolean;
  // Error from last operation
  error: Error | null;
  // Freeze a card
  freezeCard: (cardId: number) => Promise<void>;
  // Unfreeze a card
  unfreezeCard: (cardId: number) => Promise<void>;
  // Block a card (permanent)
  blockCard: (cardId: number) => Promise<void>;
  // Toggle international payments
  toggleInternational: (cardId: number) => Promise<void>;
  // Toggle online payments
  toggleOnline: (cardId: number) => Promise<void>;
  // Toggle contactless payments
  toggleContactless: (cardId: number) => Promise<void>;
  // Update daily limit
  updateDailyLimit: (cardId: number, limit: number) => Promise<void>;
  // Refresh cards from server
  refreshCards: () => Promise<void>;
}

/**
 * Hook for optimistic card management
 * 
 * @param initialCards - Initial array of cards
 * @returns Card state and mutation functions
 * 
 * @example
 * ```tsx
 * function CardManager() {
 *   const [cards, setCards] = useState<Card[]>([]);
 *   const { 
 *     cards: optimisticCards,
 *     freezeCard,
 *     isPending 
 *   } = useOptimisticCards(cards, setCards);
 *   
 *   return (
 *     <div>
 *       {optimisticCards.map(card => (
 *         <CardItem 
 *           key={card.id}
 *           card={card}
 *           onFreeze={() => freezeCard(card.id)}
 *         />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useOptimisticCards(
  serverCards: Card[],
  setServerCards: Dispatch<SetStateAction<Card[]>>
): UseOptimisticCardsResult {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<Error | null>(null);
  
  // Optimistic state that updates immediately
  const [optimisticCards, addOptimisticUpdate] = useOptimistic(
    serverCards,
    cardReducer
  );

  // Generic action handler
  const performAction = useCallback(async (
    action: CardAction,
    apiCall: () => Promise<any>
  ) => {
    setError(null);
    
    // Apply optimistic update immediately
    startTransition(() => {
      addOptimisticUpdate(action);
    });

    try {
      // Make API call
      const response = await apiCall();
      
      if (response.success && response.data) {
        // Update server state with actual response
        setServerCards(prev => 
          prev.map(card => 
            card.id === action.cardId ? response.data : card
          )
        );
      }
    } catch (err) {
      // On error, the optimistic state will be reverted automatically
      // when serverCards is updated from a refresh
      setError(err instanceof Error ? err : new Error('Operation failed'));
      
      // Optionally refresh to get true state
      console.error('Card operation failed:', err);
    }
  }, [addOptimisticUpdate, setServerCards, startTransition]);

  const freezeCard = useCallback(async (cardId: number) => {
    await performAction(
      { type: 'FREEZE', cardId },
      () => cardApi.toggleFreeze(cardId.toString(), true)
    );
  }, [performAction]);

  const unfreezeCard = useCallback(async (cardId: number) => {
    await performAction(
      { type: 'UNFREEZE', cardId },
      () => cardApi.toggleFreeze(cardId.toString(), false)
    );
  }, [performAction]);

  const blockCard = useCallback(async (cardId: number) => {
    await performAction(
      { type: 'BLOCK', cardId },
      () => cardApi.update(cardId.toString(), { status: 'BLOCKED' })
    );
  }, [performAction]);

  const toggleInternational = useCallback(async (cardId: number) => {
    const card = serverCards.find(c => c.id === cardId);
    if (!card) return;
    
    await performAction(
      { type: 'TOGGLE_INTERNATIONAL', cardId },
      () => cardApi.update(cardId.toString(), { 
        is_international_enabled: !card.international_enabled 
      })
    );
  }, [performAction, serverCards]);

  const toggleOnline = useCallback(async (cardId: number) => {
    const card = serverCards.find(c => c.id === cardId);
    if (!card) return;
    
    await performAction(
      { type: 'TOGGLE_ONLINE', cardId },
      () => cardApi.update(cardId.toString(), { 
        is_online_enabled: !card.online_enabled 
      })
    );
  }, [performAction, serverCards]);

  const toggleContactless = useCallback(async (cardId: number) => {
    const card = serverCards.find(c => c.id === cardId);
    if (!card) return;
    
    await performAction(
      { type: 'TOGGLE_CONTACTLESS', cardId },
      // Note: API may not have contactless setting, using update as placeholder
      () => cardApi.update(cardId.toString(), {})
    );
  }, [performAction, serverCards]);

  const updateDailyLimit = useCallback(async (cardId: number, limit: number) => {
    await performAction(
      { type: 'UPDATE_LIMIT', cardId, payload: { limit } },
      () => cardApi.update(cardId.toString(), { daily_limit: limit })
    );
  }, [performAction]);

  const refreshCards = useCallback(async () => {
    try {
      const response = await cardApi.getAll();
      if (response.success && response.data) {
        setServerCards(response.data as Card[]);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to refresh cards'));
    }
  }, [setServerCards]);

  return {
    cards: optimisticCards,
    isPending,
    error,
    freezeCard,
    unfreezeCard,
    blockCard,
    toggleInternational,
    toggleOnline,
    toggleContactless,
    updateDailyLimit,
    refreshCards,
  };
}

export default useOptimisticCards;
