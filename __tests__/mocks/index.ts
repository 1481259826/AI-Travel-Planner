/**
 * 统一的 Mock 导出
 *
 * 从这个文件导入所有 Mock，方便管理和使用
 */

// Supabase Mocks
export {
  mockUser,
  mockProfile,
  mockTrip,
  mockExpense,
  mockApiKey,
  createMockSupabaseClient,
  createMockAuthMiddleware,
} from './supabase'

// AMap Mocks
export {
  MockMarker,
  MockInfoWindow,
  MockPolyline,
  MockMap,
  MockScale,
  MockToolBar,
  MockDriving,
  createAMapMock,
  setupAMapMock,
  cleanupAMapMock,
  createAMapLoaderMock,
  mockAMapLoaderLoaded,
  mockAMapLoaderLoading,
  mockAMapLoaderError,
} from './amap'

// AI Model Mocks
export {
  mockGeneratedItinerary,
  createMockAIClient,
  mockAIHelper,
  mockCoordinateFixer,
} from './ai-models'
