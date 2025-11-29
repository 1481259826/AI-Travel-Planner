/**
 * Agent Prompts 统一导出
 */

// Weather Scout
export {
  WEATHER_SCOUT_SYSTEM_PROMPT,
  buildWeatherScoutUserMessage,
} from './weather-scout'

// Itinerary Planner
export {
  ITINERARY_PLANNER_SYSTEM_PROMPT,
  buildItineraryPlannerUserMessage,
} from './itinerary-planner'

// Attraction Enricher
export {
  ATTRACTION_ENRICHER_SYSTEM_PROMPT,
  buildAttractionEnricherUserMessage,
  parseAttractionEnricherResponse,
} from './attraction-enricher'

// Accommodation Specialist
export {
  ACCOMMODATION_SYSTEM_PROMPT,
  buildAccommodationUserMessage,
} from './accommodation'

// Transport Logistician
export {
  TRANSPORT_SYSTEM_PROMPT,
  buildTransportUserMessage,
} from './transport'

// Dining Recommender
export {
  DINING_SYSTEM_PROMPT,
  buildDiningUserMessage,
} from './dining'

// Budget Critic
export {
  BUDGET_CRITIC_SYSTEM_PROMPT,
  buildBudgetCriticUserMessage,
} from './budget-critic'

// Finalize
export {
  FINALIZE_SYSTEM_PROMPT,
  buildFinalizeUserMessage,
} from './finalize'
