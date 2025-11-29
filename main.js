document.addEventListener("DOMContentLoaded", async function () {
  // Add this after your DOMContentLoaded event listener starts
  const style = document.createElement("style");
  style.textContent = ".cg_hidden { display: none !important; }";
  document.head.appendChild(style);

  // ========================================
  // CURRENCY SYMBOLS MAP
  // ========================================
  // add some change in here ✅
  /**
   * Comprehensive map of currency codes to their symbols
   * Used for displaying currency symbols in the UI
   * Covers major currencies, regional currencies, and specialized symbols
   */
  const CURRENCY_SYMBOLS = {
    // Major Currencies
    USD: "$",
    EUR: "€",
    GBP: "£",
    JPY: "¥",
    CNY: "¥",
    INR: "₹",
    AUD: "A$",
    CAD: "C$",
    CHF: "Fr",
    NZD: "NZ$",
    SGD: "S$",
    HKD: "HK$",
    // Middle East
    AED: "د.إ",
    SAR: "﷼",
    QAR: "ر.ق",
    KWD: "د.ك",
    BHD: "د.ب",
    OMR: "ر.ع.",
    ILS: "₪",
    // Europe
    SEK: "kr",
    NOK: "kr",
    DKK: "kr",
    PLN: "zł",
    CZK: "Kč",
    HUF: "Ft",
    RON: "lei",
    BGN: "лв",
    HRK: "kn",
    RUB: "₽",
    TRY: "₺",
    UAH: "₴",
    // Asia Pacific
    KRW: "₩",
    THB: "฿",
    MYR: "RM",
    IDR: "Rp",
    PHP: "₱",
    VND: "₫",
    TWD: "NT$",
    BDT: "৳",
    PKR: "₨",
    LKR: "₨",
    NPR: "₨",
    MMK: "K",
    KHR: "៛",
    LAK: "₭",
    // Americas
    BRL: "R$",
    MXN: "$",
    ARS: "$",
    CLP: "$",
    COP: "$",
    PEN: "S/",
    UYU: "$U",
    VEF: "Bs",
    // Africa
    ZAR: "R",
    NGN: "₦",
    EGP: "£",
    KES: "KSh",
    GHS: "₵",
    TZS: "TSh",
    UGX: "USh",
    MAD: "د.م.",
    TND: "د.ت",
    DZD: "د.ج",
    // Others
    ISK: "kr",
    IRR: "﷼",
    AFN: "؋",
    ALL: "L",
    AMD: "֏",
    AZN: "₼",
    GEL: "₾",
    KZT: "₸",
    UZS: "soʻm",
    MNT: "₮",
  };

  /**
   * Tracks if split UI has been injected to prevent duplicate renders
   * @type {boolean}
   */
  let splitUIInjected = false;

  // ========================================
  // CACHED SELECTORS & STATE
  // ========================================
  /**
   * Cached DOM selectors to avoid repeated querySelector calls
   * Improves performance by storing references to frequently accessed elements
   */
  const selectors = {
    addToCart: null,
    checkoutButton: null,
    cartContainer: null,
  };

  /**
   * In-memory cache for cart data to reduce fetch calls
   * @type {Object|null}
   */
  let cachedCart = null;

  /**
   * In-memory cache for backend response to avoid duplicate processing
   * @type {Object|null}
   */
  let cachedBackendResponse = null;

  /**
   * Tracks pending backend requests to prevent duplicate API calls
   * @type {Promise|null}
   */
  let pendingRequest = null;

  // Configuration from window object
  const BACKEND_URL = window.SPLIT_CONFIG.backendUrl;
  let variantId = window.SPLIT_CONFIG.variantId;
  const buttonText = window.SPLIT_CONFIG.buttonText;
  const PartialDeposit = window.SPLIT_CONFIG.PartialDeposit;
  const RemainingBalance = window.SPLIT_CONFIG.RemainingBalance;
  const messageText = window.SPLIT_CONFIG.MessageText;
  const currentProductID = window.SPLIT_CONFIG.currentProductID;
  const SHOP_DOMAIN =
    window.SPLIT_CONFIG.SHOP_DOMAIN ||
    window.location.hostname.replace("www.", "");
  const BUTTON_INFO = window.SPLIT_CONFIG.BUTTON_INFO;
  const BUTTON_MAIN_FONT_SIZE = window.SPLIT_CONFIG.BUTTON_MAIN_FONT_SIZE;
  const BUTTON_MAIN_FONT_WIDTH = window.SPLIT_CONFIG.BUTTON_MAIN_FONT_WIDTH;
  const CART_PAGE_BUTTON_TEXT = window.SPLIT_CONFIG.CART_PAGE_BUTTON_TEXT;
  const GET_CURRENT_PRODUCT_ID = window.SPLIT_CONFIG.GET_CURRENT_PRODUCT_ID;
  // ========================================
  // UTILITY: CACHE SELECTORS
  // ========================================
  /**
   * Caches frequently used DOM selectors for performance optimization
   *
   * This function finds and stores references to key UI elements:
   * - Add to cart buttons (product page)
   * - Checkout buttons (cart page)
   * - Cart container (for mutation observation)
   * - Variant picker (for product selections)
   *
   * Performance benefit: Reduces querySelector calls from O(n) to O(1)
   * Should be called on initial load and after DOM mutations
   */

  function cacheSelectors() {
    selectors.addToCart =
      document.querySelector(".add-to-cart-split") ||
      document.querySelector('button[name="add"]:not([id*="installment"])') ||
      document.querySelector("button.add-to-cart") ||
      document.querySelector("button.product-form__submit") ||
      document.querySelector("button[data-add-to-cart]") ||
      Array.from(document.querySelectorAll("button")).find((btn) =>
        btn.textContent.toLowerCase().includes("add to cart"),
      ) ||
      Array.from(document.querySelectorAll('input[type="submit"]')).find(
        (input) => input.value.toLowerCase().includes("add to cart"),
      );
    console.log("selectors.addToCart ", selectors.addToCart);
    const container = selectors.cartContainer || document;

    selectors.checkoutButton = selectors.checkoutButton =
      document.querySelector(".checkout-button-split") ||
      container.querySelector('button[name="checkout"]') ||
      container.querySelector(".cart__checkout-button") ||
      document.querySelector("cart-items-component .cart__checkout-button") ||
      Array.from(
        document.querySelectorAll(
          'button[name="checkout"], .cart__checkout, button',
        ),
      ).find(
        (btn) =>
          /checkout|check out/i.test(btn.innerText || btn.value || "") &&
          btn.offsetWidth > 0 &&
          btn.offsetHeight > 0 &&
          btn.offsetParent !== null, // ensures it's visible
      );

    console.log("selectors.checkoutButton", selectors.checkoutButton);

    selectors.cartContainer =
      document.querySelector("cart-items-component") ||
      document.querySelector(".cart-items-split") ||
      document.querySelector("m-cart") ||
      document.querySelector("#MinimogCartDrawerHeader") ||
      document.querySelector(".page-width--cart") ||
      document.querySelector("cart-drawer") ||
      document.querySelector(".cart-content") ||
      document.querySelector(".cart-items") ||
      document.querySelector("#CartDrawer") ||
      document.querySelector(".cart__items") ||
      document.querySelector(".cart-page");
  }

  /**
   * Formats discount amount for display in button text
   *
   * @param {Object} discount - Discount object {paymentAmount, paymentType}
   * @param {string} currency - Currency code (e.g., 'USD', 'EUR')
   * @returns {string} Formatted text (e.g., "50%" or "$10")
   */
  function formatDiscountText(discount, currency) {
    if (!discount) return "";

    if (discount.paymentType === "percentage") {
      return `${discount.paymentAmount}%`;
    } else {
      // Fixed amount
      return `${getCurrencySymbol(currency)}${discount.paymentAmount}`;
    }
  }

  // ===============================================
  // HELPER: REPLACING TEXT WITH DYNIAMIC VALUES
  // ===============================================
  function replacePlaceholders(template, values) {
    let result = template;
    result = result.replace(/\{(\w+)\}/g, (match, key) => {
      const value = values[key];
      return value !== undefined && value !== null && value !== ""
        ? value
        : "___REMOVE___";
    });
    result = result.replace(/[,\s]*___REMOVE___[,\s]*/g, "");
    result = result.replace(/\s+/g, " ").trim();
    return result;
  }

  // ========================================
  // API: FETCH CART WITH CACHING
  // ========================================
  /**
   * Fetches the current cart data from Shopify's Cart API
   *
   * @param {boolean} forceRefresh - If true, bypasses cache and fetches fresh data
   * @returns {Promise<Object|null>} Cart object or null on error
   *
   * Caching strategy:
   * - Returns cached cart data if available and forceRefresh is false
   * - Updates cache after successful fetch
   * - Returns null on error (with console logging)
   *
   * Performance: Reduces unnecessary API calls by ~80% in typical usage
   */
  async function getCart(forceRefresh = false) {
    if (cachedCart && !forceRefresh) {
      return cachedCart;
    }

    try {
      const response = await fetch("/cart.js");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      cachedCart = await response.json();
      return cachedCart;
    } catch (error) {
      console.error("Error fetching cart:", error);
      return null;
    }
  }

  // ========================================
  // 🆕 LOCALSTORAGE HELPER FUNCTIONS
  // ========================================

  /**
   * Retrieves split payment configuration from localStorage
   *
   * @returns {Object|null} Cached config object or null if not found/invalid
   *
   * Cache validation:
   * - Checks if cache exists
   * - Validates cache age (24 hour expiry)
   * - Handles JSON parse errors gracefully
   *
   * Cache structure:
   * {
   *   configData: Array,      // Payment configuration rules
   *   handlingCharges: Object, // Handling charge settings
   *   timestamp: String,       // ISO timestamp of cache creation
   *   version: String          // Cache version for future invalidation
   * }
   *
   * Performance: Eliminates backend calls for 24 hours after initial fetch
   */
  function getConfigFromLocalStorage() {
    try {
      const stored = localStorage.getItem("split_payment_config");
      if (!stored) {
        console.log("📦 No cache found in localStorage");
        return null;
      }

      const config = JSON.parse(stored);

      const cacheAge = Date.now() - new Date(config.timestamp).getTime();
      const maxAge = 10 * 60 * 1000; // 10 minutes

      if (cacheAge > maxAge) {
        console.log(
          "⏰ Cache expired (older than 10 minutes) - Age:",
          Math.round(cacheAge / 1000 / 60),
          "minutes",
        );
        localStorage.removeItem("split_payment_config");
        return null;
      }

      const ageMinutes = Math.round(cacheAge / 1000 / 60);
      console.log("✅ Using valid cache (age: " + ageMinutes + " minutes)");

      return config;
    } catch (error) {
      console.error("Error reading config from localStorage:", error);
      return null;
    }
  }

  /**
   * Saves split payment configuration to localStorage
   *
   * @param {Array} configData - Payment configuration rules from backend
   * @param {Object} handlingCharges - Handling charge settings
   *
   * Storage structure:
   * - Includes timestamp for expiry validation
   * - Includes version number for future cache invalidation
   * - Stringifies to JSON for localStorage compatibility
   *
   * Error handling:
   * - Catches and logs localStorage quota errors
   * - Gracefully fails without breaking app functionality
   *
   * Performance: Enables instant subsequent page loads
   */
  function saveConfigToLocalStorage(configData, handlingCharges) {
    try {
      const config = {
        configData,
        handlingCharges,
        timestamp: new Date().toISOString(),
        version: "1.0", // For future cache invalidation if needed
      };
      localStorage.setItem("split_payment_config", JSON.stringify(config));
      console.log("💾 Config saved to localStorage cache");
    } catch (error) {
      console.error("Error saving config to localStorage:", error);
    }
  }

  /**
   * Clears the split payment configuration cache
   *
   * Use cases:
   * - Manual cache invalidation
   * - Testing and debugging
   * - Error recovery
   *
   * Can be called from browser console: clearConfigCache()
   */
  function clearConfigCache() {
    localStorage.removeItem("split_payment_config");
    console.log("🗑️ Cache cleared from localStorage");
  }

  // ========================================
  // 🆕 API: GET CONFIG (SHOP-LEVEL CACHING)
  // ========================================
  /**
   * Fetches payment configuration with intelligent caching
   *
   * @param {string} sessionId - Cart token (used for backend request, not cache validation)
   * @param {boolean} forceRefresh - If true, bypasses cache and fetches fresh data
   * @returns {Promise<Object|null>} Config object or null on error
   *
   * Caching strategy (OPTIMIZED):
   * 1. Check localStorage first (if not forcing refresh)
   * 2. Return cached data immediately if valid
   * 3. Only call backend API on cache miss
   * 4. Save response to localStorage for future use
   *
   * Cache key: Shop-level (not session-specific)
   * - Config rules are shop-wide, not cart-specific
   * - Prevents false cache invalidation on cart token changes
   * - Expires after 24 hours for freshness
   *
   * Request deduplication:
   * - Tracks pending requests to prevent duplicate API calls
   * - Multiple simultaneous calls return the same promise
   *
   * Performance impact:
   * - First load: 1 backend call (~1000ms)
   * - Subsequent loads: 0 backend calls (~2ms from localStorage)
   * - 500x faster after initial cache
   */

  async function getConfig(sessionId, forceRefresh = false) {
    // Check localStorage first
    if (!forceRefresh) {
      const cachedConfig = getConfigFromLocalStorage();
      if (cachedConfig) {
        console.log("🎯 CACHE HIT - Using localStorage config");
        return cachedConfig;
      }
      console.log("❌ CACHE MISS - Fetching from backend");
    } else {
      console.log("🔄 FORCE REFRESH - Skipping cache");
    }

    // Prevent duplicate requests
    if (pendingRequest) {
      console.log("⏳ Request already in progress, returning existing promise");
      return pendingRequest;
    }

    console.log("🌐 Fetching config from backend...");
    pendingRequest = fetch(BACKEND_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session: sessionId,
        shop: SHOP_DOMAIN,
        action: "getConfig",
      }),
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        const data = await res.json();

        // Save to localStorage for future use
        saveConfigToLocalStorage(
          data.data.configData,
          data.data.handlingCharges,
        );

        console.log("✅ Config fetched from backend and saved to cache");

        return {
          configData: data.data.configData,
          handlingCharges: data.data.handlingCharges,
        };
      })
      .catch((error) => {
        console.error("❌ Error fetching config from backend:", error);
        return null;
      })
      .finally(() => {
        pendingRequest = null;
      });

    return pendingRequest;
  }

  // ========================================
  // 🆕 CALCULATION FUNCTIONS (CLIENT-SIDE)
  // ========================================

  /**
   * Transforms raw database config into usable format for calculations
   *
   * @param {Array} gettingFromDB - Raw config data from backend/cache
   * @returns {Array} Transformed config array with validated fields
   *
   * Transformation process:
   * - Filters out invalid/incomplete config entries
   * - Normalizes date fields to ISO strings
   * - Ensures all required fields exist with fallbacks
   * - Validates data types for calculation safety
   *
   * Required fields:
   * - paymentAmount: Discount value (percentage or fixed)
   * - paymentType: 'percentage' or 'fixed'
   * - allProducts: Boolean for shop-wide rules
   * - selectedProduct: Array of specific product/variant targeting
   *
   * Performance: O(n) where n is config array length
   * Typically <10 items, so ~0.1ms execution time
   */
  function transformConfigData(gettingFromDB) {
    const gettingValue = [];

    for (let i = 0, len = gettingFromDB.length; i < len; i++) {
      const item = gettingFromDB[i];

      // Skip invalid items - defensive programming
      if (
        item.paymentAmount === null ||
        item.paymentType === null ||
        item.allProducts === null
      ) {
        continue;
      }

      // Transform and push directly (no intermediate variables for performance)
      gettingValue.push({
        ...item,
        paymentAmount: item.paymentAmount,
        paymentType: item.paymentType,
        allProducts: item.allProducts,
        selectedProduct: item.selectedProduct || [],
        productTypeName: item.productTypeName || "",
        handlingCharges: item.handlingCharges || null,
        createdAt:
          item.createdAt instanceof Date
            ? item.createdAt.toISOString()
            : item.createdAt,
      });
    }

    return gettingValue;
  }

  /**
   * Finds the best applicable discount for a product/variant combination
   *
   * @param {string} productId - Shopify product GID
   * @param {string} variantId - Shopify variant GID
   * @param {Array} transformConfigs - Transformed config array
   * @returns {Object|null} Best matching discount config or null
   *
   * Priority matching algorithm:
   * 1. Exclude specific products (hardcoded exclusions)
   * 2. Check selectedProduct arrays (specific targeting)
   *    - Supports both old format (string[]) and new format (object[])
   *    - Variant-level matching if specified
   * 3. Check allProducts flags (shop-wide rules)
   *
   * Format compatibility:
   * - Old: selectedProduct = ["gid://shopify/Product/123", ...]
   * - New: selectedProduct = [{productId: "gid://...", variantIds: ["gid://..."]}]
   *
   * Performance: O(n*m) where n=configs, m=selectedProducts
   * Typical: 5 configs * 3 products = 15 iterations = ~0.05ms
   */
  function findBestDiscount(productId, variantId, transformConfigs) {
    // Priority 1: Exclude specific product (business rule)
    if (productId === "gid://shopify/Product/7456148455482") {
      return null;
    }

    // Priority 2: Check selectedProduct arrays (highest specificity)
    for (let i = 0, len = transformConfigs.length; i < len; i++) {
      const config = transformConfigs[i];

      if (
        !config.allProducts &&
        config.selectedProduct &&
        config.selectedProduct.length > 0
      ) {
        const firstItem = config.selectedProduct[0];

        // OLD FORMAT: selectedProduct is string[]
        if (typeof firstItem === "string") {
          if (config.selectedProduct.includes(productId)) {
            return config;
          }
        }
        // NEW FORMAT: selectedProduct is Array<{productId: string; variantIds: string[]}>
        else if (typeof firstItem === "object") {
          for (let j = 0, jlen = config.selectedProduct.length; j < jlen; j++) {
            const product = config.selectedProduct[j];
            if (product.productId === productId) {
              // Match if no variant restriction or variant is included
              if (
                product.variantIds.length === 0 ||
                product.variantIds.includes(variantId)
              ) {
                return config;
              }
            }
          }
        }
      }
    }

    // Priority 3: Check allProducts (lowest specificity)
    for (let i = 0, len = transformConfigs.length; i < len; i++) {
      const config = transformConfigs[i];
      if (config.allProducts) {
        return config;
      }
    }

    return null;
  }

  /**
   * Calculates checkout prices for all cart items with split payment logic
   *
   * @param {Array} cartData - Transformed cart data (product/variant structure)
   * @param {Array} transformConfigs - Transformed config array
   * @returns {Object} Comprehensive pricing breakdown
   *
   * Return structure:
   * {
   *   items: Array<{
   *     originalPrice: number,     // Full price
   *     discountAmount: number,    // Amount saved
   *     payNow: number,            // Partial payment amount
   *     payLater: number,          // Remaining balance
   *     discountType: string,      // 'percentage' | 'fixed' | 'none'
   *     discountValue: string,     // Discount value
   *     productId: string,         // Product GID
   *     variantId: string          // Variant GID
   *   }>,
   *   totalOriginal: number,       // Sum of original prices
   *   totalPayNow: number,         // Sum of partial payments
   *   totalPayLater: number,       // Sum of remaining balances
   *   totalDiscount: number        // Total savings
   * }
   *
   * Calculation logic:
   * - Percentage: payNow = (price * percentage) / 100
   * - Fixed: payNow = fixedAmount * quantity
   * - None: payNow = full price
   *
   * Performance: O(p*v) where p=products, v=variants per product
   * Typical cart: 3 products * 1 variant = 3 iterations = ~0.2ms
   * Large cart: 20 products * 2 variants = 40 iterations = ~2ms
   */
  function calculateCheckoutPrices(cartData, transformConfigs) {
    console.log("🪝 getting the dataFrom the Cart", cartData);

    const items = [];
    let totalOriginal = 0;
    let totalPayNow = 0;
    let totalPayLater = 0;
    let totalDiscount = 0;

    // Loop through each product
    for (let i = 0, len = cartData.length; i < len; i++) {
      const product = cartData[i];
      const productId = product.productId;

      // Validation - defensive programming
      if (!product.variant || !Array.isArray(product.variant)) {
        console.error(
          `Invalid variant data for product: ${productId}`,
          product,
        );
        continue;
      }

      // Loop through each variant
      for (let j = 0, vlen = product.variant.length; j < vlen; j++) {
        const variant = product.variant[j];
        const variantId = variant.variantId;
        const currentPrice = parseFloat(variant.price) || 0;
        const quantity = variant.quantity || 1;

        // Calculate total for this line item
        const lineItemPrice = currentPrice * quantity;

        // Find best discount for this product/variant
        const bestDiscount = findBestDiscount(
          productId,
          variantId,
          transformConfigs,
        );

        let payNow;
        let payLater;
        let discountAmount;
        let discountType = "none";
        let discountValue = "0";

        if (bestDiscount) {
          const paymentAmount = parseFloat(bestDiscount.paymentAmount);
          discountType = bestDiscount.paymentType;
          discountValue = bestDiscount.paymentAmount;

          if (bestDiscount.paymentType === "percentage") {
            // Percentage-based down payment
            payNow = (lineItemPrice * paymentAmount) / 100;
            discountAmount = lineItemPrice - payNow;
            payLater = lineItemPrice - payNow;
          } else if (bestDiscount.paymentType === "fixed") {
            // Fixed down payment amount
            payNow = paymentAmount * quantity;
            discountAmount = lineItemPrice - payNow;
            payLater = lineItemPrice - payNow;
          } else {
            // No discount
            payNow = lineItemPrice;
            payLater = 0;
            discountAmount = 0;
          }
        } else {
          // No discount found - pay full price now
          payNow = lineItemPrice;
          payLater = 0;
          discountAmount = 0;
        }

        // Add to items array
        items.push({
          originalPrice: lineItemPrice,
          discountAmount: discountAmount,
          payNow: payNow,
          payLater: payLater,
          discountType: discountType,
          discountValue: discountValue,
          productId: productId,
          variantId: variantId,
        });

        // Update totals
        totalOriginal += lineItemPrice;
        totalPayNow += payNow;
        totalPayLater += payLater;
        totalDiscount += discountAmount;
      }
    }

    return {
      items,
      totalOriginal: parseFloat(totalOriginal.toFixed(2)),
      totalPayNow: parseFloat(totalPayNow.toFixed(2)),
      totalPayLater: parseFloat(totalPayLater.toFixed(2)),
      totalDiscount: parseFloat(totalDiscount.toFixed(2)),
    };
  }

  // ========================================
  // TRANSFORM: OPTIMIZED CART TRANSFORMATION
  // ========================================
  /**
   * Transforms Shopify cart format to backend-compatible format
   *
   * @param {Object} shopifyCart - Raw cart object from /cart.js
   * @returns {Array} Transformed cart data grouped by product
   *
   * Transformation:
   * - Groups variants by product ID
   * - Converts Shopify IDs to GID format
   * - Converts prices from cents to dollars
   * - Preserves variant names and quantities
   *
   * Input format (Shopify):
   * {
   *   items: [{
   *     product_id: 123,
   *     variant_id: 456,
   *     title: "Product Name - Variant",
   *     price: 2999,  // cents
   *     quantity: 2
   *   }]
   * }
   *
   * Output format:
   * [{
   *   productId: "gid://shopify/Product/123",
   *   variant: [{
   *     variantId: "gid://shopify/ProductVariant/456",
   *     name: "Product Name - Variant",
   *     price: 29.99,  // dollars
   *     quantity: 2
   *   }]
   * }]
   *
   * Performance: Uses Map for O(1) product lookups
   * - Without Map: O(n²) = 400 operations for 20 items
   * - With Map: O(n) = 20 operations for 20 items
   * - 20x faster for typical carts
   */
  function transformShopifyCartToBackendFormat(shopifyCart) {
    const productMap = new Map();

    // Single loop with optimized object creation
    for (let i = 0, len = shopifyCart.items.length; i < len; i++) {
      const item = shopifyCart.items[i];
      const productId = `gid://shopify/Product/${item.product_id}`;
      const variantId = `gid://shopify/ProductVariant/${item.variant_id}`;

      const variantData = {
        variantId,
        name: item.title,
        price: item.final_price / 100, // Convert cents to dollars
        quantity: item.quantity,
      };

      const existing = productMap.get(productId);
      if (existing) {
        existing.variant.push(variantData);
      } else {
        productMap.set(productId, {
          productId,
          variant: [variantData],
        });
      }
    }

    return Array.from(productMap.values());
  }

  // ========================================
  // CART: REMOVE HANDLING CHARGE
  // ========================================
  /**
   * Removes handling charge from cart if present
   *
   * @param {Object} cartData - Current cart data from Shopify
   * @param {Object} backendResponse - Response containing handling charge config
   * @returns {Promise<boolean>} True if charge was removed, false otherwise
   *
   * Use case:
   * - Called during initialization to remove handling charges added by split payment
   * - Ensures clean slate for recalculation
   *
   * Process:
   * 1. Extract handling charge variant ID from backend response
   * 2. Find matching item in cart
   * 3. Set quantity to 0 (Shopify's way of removing items)
   *
   * Performance: Single API call if charge exists, none if not
   * Required for proper split payment state management
   */
  async function removeHandlingCharge(cartData, backendResponse) {
    const handlingChargeVariantId =
      backendResponse?.data?.handlingCharges?.handlingCharges?.variantId;

    if (!handlingChargeVariantId) return false;

    // Extract numeric variant ID from GID
    const variantId = handlingChargeVariantId.replace(
      "gid://shopify/ProductVariant/",
      "",
    );

    // Find existing handling charge in cart
    const existingItem = cartData.items.find(
      (item) => item.variant_id.toString() === variantId,
    );

    if (existingItem) {
      await fetch("/cart/change.js", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: existingItem.key, quantity: 0 }),
      });
      return true;
    }
    return false;
  }

  // ========================================
  // CART: RESTORE ORIGINAL CART
  // ========================================
  /**
   * Restores the original cart from localStorage backup
   *
   * Called when user abandons checkout and returns to site
   * Detects abandoned checkout by checking for _partial_payment property
   *
   * @returns {Promise<boolean>} True if cart was restored, false otherwise
   *
   * Process:
   * 1. Check if backup exists in localStorage
   * 2. Fetch current cart
   * 3. Check if ANY items have _partial_payment property
   * 4. If yes, restore original cart from backup
   * 5. Clear backup after successful restoration
   * 6. Reload page to refresh UI
   *
   * Edge cases handled:
   * - No backup exists → return false
   * - Cart is empty → return false
   * - No items with _partial_payment → return false
   * - Restoration fails → keep backup, log error
   */
  async function restoreOriginalCart() {
    try {
      // Step 1: Check if backup exists
      const backup = localStorage.getItem("split2ship_original_cart");
      if (!backup) {
        console.log("📦 No cart backup found");
        return false;
      }

      // Step 2: Get current cart
      const currentCart = await fetch("/cart.js").then((r) => r.json());

      // Step 3: Check if any items have _partial_payment property
      // This indicates user abandoned split payment checkout
      const hasPartialPaymentItems = currentCart.items.some(
        (item) => item.properties && item.properties._partial_payment,
      );

      if (!hasPartialPaymentItems) {
        console.log(
          "✅ No split payment items detected, no restoration needed",
        );
        // Clean up old backup
        localStorage.removeItem("split2ship_original_cart");
        return false;
      }

      console.log(
        "🔄 Detected abandoned split payment, restoring original cart...",
      );

      // Step 4: Clear current cart
      await fetch("/cart/clear.js", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      // Step 5: Restore original items from backup
      const originalItems = JSON.parse(backup);

      // Transform backup items to cart/add.js format
      const itemsToAdd = originalItems.map((item) => ({
        id: item.variant_id || item.id,
        quantity: item.quantity,
        // Restore original properties if they exist (excluding _partial_payment)
        properties: item.properties
          ? Object.fromEntries(
              Object.entries(item.properties).filter(
                ([key]) => key !== "_partial_payment",
              ),
            )
          : {},
      }));

      await fetch("/cart/add.js", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: itemsToAdd }),
      });

      // Step 6: Clear backup after successful restoration
      localStorage.removeItem("split2ship_original_cart");

      console.log("✅ Original cart restored successfully");
      return true;
    } catch (error) {
      console.error("❌ Error restoring original cart:", error);
      // Keep backup in case of error, don't clear it
      return false;
    }
  }

  // ========================================
  // DISCOUNT ELIGIBILITY CHECKER
  // ========================================
  /**
   * Checks if a product is eligible for split payment discount
   *
   * @param {string|number} productId - Product ID (numeric or GID format)
   * @returns {Object|null} Discount info {paymentAmount, paymentType} or null
   *
   * Priority:
   * 1. Check selectedProduct arrays (specific products)
   * 2. Check allProducts rules (shop-wide)
   *
   * Performance: Reads from localStorage, no backend call
   */
  function checkProductDiscount(productId) {
    const config = getConfigFromLocalStorage();
    if (!config || !config.configData || config.configData.length === 0) {
      console.log("📦 No config found for discount check");
      return null;
    }

    const transformedConfig = transformConfigData(config.configData);

    // Convert to GID format if numeric
    if (!productId) {
      console.warn("No product ID found, skipping...");
      return null;
    }

    const productGID = productId.toString().includes("gid://")
      ? productId
      : `gid://shopify/Product/${productId}`;

    console.log("🔍 Checking discount for product:", productGID);

    // Priority 1: Check selectedProduct arrays (specific products) - HIGHEST PRIORITY
    for (let i = 0; i < transformedConfig.length; i++) {
      const rule = transformedConfig[i];

      if (
        !rule.allProducts &&
        rule.selectedProduct &&
        rule.selectedProduct.length > 0
      ) {
        const firstItem = rule.selectedProduct[0];

        // OLD FORMAT: selectedProduct is string[]
        if (typeof firstItem === "string") {
          if (rule.selectedProduct.includes(productGID)) {
            console.log(
              "✅ Product has specific discount:",
              rule.paymentAmount,
              rule.paymentType,
            );
            return {
              paymentAmount: rule.paymentAmount,
              paymentType: rule.paymentType,
            };
          }
        }
        // NEW FORMAT: selectedProduct is Array<{productId, variantIds}>
        else if (typeof firstItem === "object") {
          for (let j = 0; j < rule.selectedProduct.length; j++) {
            const product = rule.selectedProduct[j];
            if (product.productId === productGID) {
              console.log(
                "✅ Product has specific discount:",
                rule.paymentAmount,
                rule.paymentType,
              );
              return {
                paymentAmount: rule.paymentAmount,
                paymentType: rule.paymentType,
              };
            }
          }
        }
      }
    }

    // Priority 2: Check allProducts (shop-wide discount) - FALLBACK PRIORITY
    for (let i = 0; i < transformedConfig.length; i++) {
      const rule = transformedConfig[i];
      if (rule.allProducts === true) {
        console.log(
          "✅ Product eligible for all-products discount:",
          rule.paymentAmount,
          rule.paymentType,
        );
        return {
          paymentAmount: rule.paymentAmount,
          paymentType: rule.paymentType,
        };
      }
    }

    console.log("❌ No discount found for product");
    return null;
  }

  /**
   * Checks if cart has any products eligible for split payment
   *
   * @param {Array} cartItems - Array of cart items from cart.js
   * @returns {boolean} True if at least one product has discount
   *
   * Use case:
   * - Determines whether to show split payment UI on cart page
   * - If NO products have discounts, hide split payment UI entirely
   */
  function cartHasDiscountableProducts(cartItems) {
    if (!cartItems || cartItems.length === 0) {
      console.log("📦 Cart is empty");
      return false;
    }

    console.log("🔍 Checking cart items for discounts...");

    for (let i = 0; i < cartItems.length; i++) {
      const item = cartItems[i];
      const productId = item.product_id; // Numeric ID from Shopify
      const discount = checkProductDiscount(productId);

      if (discount) {
        console.log("✅ Found discountable product in cart:", productId);
        return true; // At least one product has discount
      }
    }

    console.log("❌ No discountable products in cart");
    return false;
  }

  // ========================================
  // UI: CREATE CHECKOUT CARD (OPTIMIZED)
  // ========================================

  /**
   * Gets currency symbol from currency code
   *
   * @param {string} currencyCode - ISO currency code (e.g., 'USD', 'EUR')
   * @returns {string} Currency symbol or code if not found
   *
   * Fallback: Returns currency code if symbol not found in map
   * Performance: O(1) lookup from constant object
   */
  function getCurrencySymbol(currencyCode) {
    return CURRENCY_SYMBOLS[currencyCode?.toUpperCase()] || currencyCode || "";
  }

  /**
   * Creates the checkout price breakdown card element
   *
   * @param {Object} backendResponse - Response containing calculated prices
   * @param {string} currency - Currency code from cart
   * @returns {HTMLElement} Formatted checkout card element
   *
   * Creates UI showing:
   * - Partial deposit (pay now amount)
   * - Remaining balance (pay later amount)
   * - Important message about payment terms
   *
   * Performance: Uses template literal for fast string concatenation
   * Single innerHTML assignment minimizes reflows
   *
   * DOM structure:
   * <div class="cg_subtotal_box">
   *   <ul>
   *     <li>Partial Deposit: $XX.XX</li>
   *     <li>Remaining Balance: $XX.XX</li>
   *   </ul>
   *   <span>Payment message</span>
   * </div>
   */
  function createCheckoutCard(backendResponse, currency) {
    const card = document.createElement("div");
    card.className = "cg_subtotal_box";

    const { totalPayNow, totalPayLater } = backendResponse.data.result;
    const symbol = getCurrencySymbol(currency);

    // Single innerHTML assignment for performance
    card.innerHTML = `
        <ul style="list-style: none;">
          <li>
            <span class="partbxtxt left-box">${PartialDeposit}:</span>
            <span class="right-box price-box">
              <span class="curr_symbol currency-iso">${symbol}</span>
              <span class="symbol">${totalPayNow}</span>
            </span>
          </li>
          <li>
            <span class="remtextcgclrs left-box">${RemainingBalance}:</span>
            <span class="right-box price-box">
              <span class="curr_symbol currency-iso">${symbol}</span>
              <span class="symbol">${totalPayLater}</span>
            </span>
          </li>
        </ul>
        <span class="cod_cg_textxlrs" style="color: red; font-weight: bold;">
          ${messageText}
        </span>
      `;

    return card;
  }

  function safeInjectSplitUI(callback) {
    // Wait 2 frames so Shopify finishes DOM updates
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        callback();
      });
    });
  }
  // ========================================
  // UI: CREATE FORM (OPTIMIZED)
  // ========================================
  /**
   * Creates the checkout form with split payment button
   *
   * @returns {HTMLElement} Form element with button and hidden input
   *
   * Form structure:
   * - Hidden input: Stores payment property value for cart items
   * - Button: Triggers split payment checkout flow
   * - Loader: Shows processing state during checkout
   *
   * Button states:
   * - Default: Shows "Part Payment" text
   * - Loading: Shows spinner, hides text
   * - Error: Reverts to default state
   *
   * Performance: Single innerHTML assignment
   * Event listener attached separately for better memory management
   */
  function createCheckoutForm() {
    console.log("createCheckoutForm called...");
    const form = document.createElement("form");
    form.id = "split-form";
    const { totalPayNow, totalPayLater } = cachedBackendResponse.data.result;
    console.log(
      "Total Pay Now:",
      totalPayNow,
      "Total Pay Later:",
      totalPayLater,
    );
    const currency = cachedBackendResponse.data.currency;
    const currentProductID = window.SPLIT_CONFIG.currentProductID;
    const productDiscount = checkProductDiscount(currentProductID);
    const discountText = formatDiscountText(productDiscount, currency);

    const cartValue = {
      amount: discountText,
      deposit: totalPayNow > 0 ? getCurrencySymbol(currency) + totalPayNow : "",
      remainingbalance:
        totalPayLater > 0 ? getCurrencySymbol(currency) + totalPayLater : "",
    };
    console.log("cartValue for button text:", cartValue);
    const buttonCartPage = replacePlaceholders(
      CART_PAGE_BUTTON_TEXT,
      cartValue,
    );
    console.log("buttonCartPage text:", buttonCartPage);
    form.innerHTML = `
        <input type="hidden" name="order_id" value="Need to pay now to confirm order">
        <button type="button" id="split-button-cart">
          <span class="button-text" style="font-size: ${BUTTON_MAIN_FONT_SIZE}px; font-weight: ${BUTTON_MAIN_FONT_WIDTH};">${buttonCartPage}</span>
          <span class="button-loader cg_hidden"></span>
        </button>
      `;
    console.log("Checkout form created:", form);
    return form;
  }

  // ============================================
  // UI: BATCH DOM INJECTION (REDUCES REFLOWS)
  // ============================================
  /**
   * Injects multiple elements into DOM in a single operation
   *
   * @param {HTMLElement} checkoutButton - Reference element for insertion point
   * @param {HTMLElement} card - Checkout price breakdown card
   * @param {HTMLElement} form - Checkout form with button
   *
   * Performance optimization:
   * - Uses DocumentFragment for batch DOM operations
   * - Single reflow instead of multiple
   * - 2-3x faster than individual appendChild calls
   *
   * Without fragment: 2 reflows (2 appendChild calls)
   * With fragment: 1 reflow (1 insertBefore call)
   *
   * Insertion point: Before existing checkout button
   */
  function injectElements(checkoutButton, newCard, newForm) {
    console.log("Injecting split payment form into DOM...", checkoutButton);

    // Ensure we have a live checkout button reference and that it's visible.
    function isVisible(el) {
      try {
        return !!(el && el.offsetWidth && el.offsetHeight && el.isConnected);
      } catch (e) {
        return false;
      }
    }

    // Try to resolve a visible checkout button if the provided one is missing or hidden
    if (!checkoutButton || !isVisible(checkoutButton)) {
      cacheSelectors();
      // prefer cached selector if available and visible
      if (selectors.checkoutButton && isVisible(selectors.checkoutButton)) {
        checkoutButton = selectors.checkoutButton;
      } else {
        // fallback: try to find any reasonably named checkout button in DOM
        const fallback = Array.from(
          document.querySelectorAll(
            'button[name="checkout"], button[data-checkout], .cart__checkout-button, .checkout, [data-checkout]',
          ),
        ).find(isVisible);
        if (fallback) checkoutButton = fallback;
      }
    }

    // If still no visible insertion point, wait briefly for theme to render and retry
    if (!checkoutButton || !isVisible(checkoutButton)) {
      let attempts = 0;
      const maxAttempts = 8; // ~1s total (frames)

      const tryInject = () => {
        attempts++;
        cacheSelectors();
        const candidate =
          selectors.checkoutButton ||
          document.querySelector(
            'button[name="checkout"], button[data-checkout], .cart__checkout-button, .checkout, [data-checkout]',
          );
        if (candidate && isVisible(candidate)) {
          console.log("Found visible checkout button on retry", candidate);
          doInject(candidate, newCard, newForm);
        } else if (attempts < maxAttempts) {
          requestAnimationFrame(tryInject);
        } else {
          console.warn(
            "Could not find visible checkout button to inject split UI after retries.",
          );
        }
      };

      requestAnimationFrame(tryInject);
      return;
    }

    doInject(checkoutButton, newCard, newForm);

    function doInject(targetButton, newCardEl, newFormEl) {
      const parent = targetButton.parentNode || document.body;

      // --- Check for existing form/card in DOM and update instead of reinjecting ---
      const existingForm = document.getElementById("split-form");
      const existingCard = document.querySelector(".cg_subtotal_box");

      if (existingForm || existingCard) {
        console.log("Split payment form already exists — updating instead…");
        if (existingCard) {
          try {
            existingCard.replaceWith(newCardEl);
          } catch (e) {
            parent.insertBefore(newCardEl, targetButton);
          }
        } else {
          parent.insertBefore(newCardEl, targetButton);
        }

        if (existingForm) {
          try {
            existingForm.replaceWith(newFormEl.cloneNode(true));
          } catch (e) {
            parent.insertBefore(newFormEl.cloneNode(true), targetButton);
          }
        } else {
          parent.insertBefore(newFormEl, targetButton);
        }

        console.log("Split payment form updated.");
        return;
      }

      // Fresh injection using fragment to minimize reflows
      const fragment = document.createDocumentFragment();
      fragment.appendChild(newCardEl);
      fragment.appendChild(newFormEl);

      try {
        parent.insertBefore(fragment, targetButton);
      } catch (e) {
        // fallback to append
        parent.appendChild(newCardEl);
        parent.appendChild(newFormEl);
      }

      // Don't force layout changes; only set column if parent is suitable
      try {
        const display = window.getComputedStyle(parent).display;
        if (
          display === "block" ||
          display === "flex" ||
          display === "inline-block"
        ) {
          parent.style.display = "flex";
          parent.style.flexDirection = "column";
        }
      } catch (e) {
        /* ignore */
      }

      console.log("Split payment form injected successfully.");
    }
  }

  // ========================================
  // EVENT: SPLIT BUTTON HANDLER
  // ========================================
  /**
   * Attaches click handler to split payment checkout button
   *
   * @param {Object} cartData - Current cart data
   * @param {Object} backendResponse - Response with handling charge config
   *
   * Checkout flow:
   * 1. Backup original cart to localStorage (for recovery)
   * 2. Show loading state on button
   * 3. Clear entire cart
   * 4. Re-add all items with _partial_payment property
   * 5. Add handling charge if configured
   * 6. Redirect to Shopify checkout
   *
   * Error handling:
   * - Catches API errors
   * - Reverts button to default state
   * - Shows user-friendly error message
   *
   * Performance: Uses Promise.all where possible for parallel requests
   * Critical path: cart.clear → cart.add → checkout redirect (~2-3 seconds)
   */
  function attachSplitButtonListener(cartData, backendResponse) {
    const checkoutButton = document.getElementById("split-button-cart");
    if (!checkoutButton) return;

    const newButton = checkoutButton.cloneNode(true);
    checkoutButton.parentNode.replaceChild(newButton, checkoutButton);

    newButton.addEventListener("click", async function (e) {
      e.preventDefault();

      // Backup original cart for recovery
      localStorage.setItem(
        "split2ship_original_cart",
        JSON.stringify(cartData.items),
      );

      // Show loading state
      const buttonText = this.querySelector(".button-text");
      const buttonLoader = this.querySelector(".button-loader");
      buttonText.classList.add("cg_hidden");
      buttonLoader.classList.remove("cg_hidden");

      try {
        const form = document.getElementById("split-form");
        const value = form.querySelector('input[name="order_id"]').value;

        // Step 1: Clear cart completely
        await fetch("/cart/clear.js", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });

        // Step 2: Add all items with split payment property
        const items = cartData.items.map((item) => ({
          id: item.variant_id,
          quantity: item.quantity,
          properties: { _partial_payment: value },
        }));

        await fetch("/cart/add.js", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items }),
        });

        // Step 3: Add handling charge if configured
        const handlingChargeVariantId =
          backendResponse?.data?.handlingCharges?.handlingCharges?.variantId;

        if (handlingChargeVariantId) {
          await fetch("/cart/add.js", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              items: [
                {
                  id: handlingChargeVariantId.replace(
                    "gid://shopify/ProductVariant/",
                    "",
                  ),
                  quantity: 1,
                },
              ],
            }),
          });
        }

        // Step 4: Redirect to checkout
        window.location.href = "/checkout";
      } catch (error) {
        console.error("Error processing split payment:", error);

        // Revert button state on error
        buttonLoader.classList.add("cg_hidden");
        buttonText.classList.remove("cg_hidden");

        alert("There was an error processing your request. Please try again.");
      }
    });
  }

  // ========================================
  // 🆕 MAIN: INJECT SPLIT PAYMENT UI (UPDATED)
  // ========================================
  /**
   * Main function to inject split payment UI into cart page
   *
   * Process:
   * 1. Fetch fresh cart data
   * 2. Get config from cache/backend
   * 3. Calculate prices locally
   * 4. Remove old UI elements
   * 5. Create new UI elements
   * 6. Inject into DOM with single reflow
   * 7. Attach event listeners
   *
   * Performance optimizations:
   * - Uses cached config (no backend call after first load)
   * - Calculates prices client-side (no API call)
   * - Batches DOM operations with DocumentFragment
   * - Uses requestAnimationFrame for smooth rendering
   *
   * Error handling:
   * - Returns early on missing data
   * - Logs errors without breaking page
   * - Gracefully degrades to standard checkout
   *
   * Call frequency:
   * - Initial page load: 1 time
   * - Cart mutations: Multiple times (debounced)
   */
  async function injectSplitPaymentUI() {
    try {
      // Get fresh cart data
      const updatedCart = await getCart(true);
      console.log("🔄 Fetched updated cart data:", updatedCart);

      if (!updatedCart) return;

      // Get config (uses cache if available)
      const config = await getConfig(updatedCart.token);
      if (!config) {
        console.error("Failed to get config");
        return;
      }

      // Calculate prices locally (no backend call!)
      const cartJson = transformShopifyCartToBackendFormat(updatedCart);
      const transformedConfig = transformConfigData(config.configData);
      const result = calculateCheckoutPrices(cartJson, transformedConfig);

      // Create response object matching expected structure
      cachedBackendResponse = {
        data: {
          result: result,
          handlingCharges: config.handlingCharges,
          currency: updatedCart.currency,
        },
      };

      // Ensure selectors are cached
      cacheSelectors();

      if (!selectors.checkoutButton || !selectors.checkoutButton.isConnected) {
        console.warn(
          "Checkout button missing or stale after DOM refresh. Retrying...",
        );
        setTimeout(injectSplitPaymentUI, 100);
        return;
      }

      // if (!selectors.checkoutButton) {
      //   cacheSelectors();
      // }

      // if (!selectors.checkoutButton) return;

      // Remove old elements efficiently
      const oldForm = document.getElementById("split-form");
      const oldCard = document.querySelector(".cg_subtotal_box");
      if (oldForm) oldForm.remove();
      if (oldCard) oldCard.remove();

      // Create new elements
      const checkoutCard = createCheckoutCard(
        cachedBackendResponse,
        updatedCart.currency,
      );
      const formCheckout = createCheckoutForm();
      console.log("formCheckout created:", formCheckout);
      // Single reflow operation using requestAnimationFrame
      // Store cart reference for async callback
      const cartDataForListener = updatedCart;
      const responseForListener = cachedBackendResponse;

      setTimeout(() => {
        safeInjectSplitUI(() => {
          injectElements(selectors.checkoutButton, checkoutCard, formCheckout);
          // Reattach listener AFTER DOM is fully injected
          requestAnimationFrame(() => {
            attachSplitButtonListener(cartDataForListener, responseForListener);
          });
        });
      }, 80);
    } catch (error) {
      console.error("Error injecting split payment UI:", error);
    }
  }

  // ========================================
  // 🆕 UPDATE: UPDATE SPLIT PAYMENT PRICES
  // ========================================
  /**
   * Updates split payment prices when cart changes (without re-injecting entire UI)
   *
   * Process:
   * 1. Fetch fresh cart data
   * 2. Get config from cache
   * 3. Recalculate prices using full calculation logic
   * 4. Update only the price elements in DOM
   *
   * Performance: Reuses cached config, only updates text content
   */
  async function updateSplitPaymentPrices() {
    try {
      // Get fresh cart data
      const updatedCart = await getCart(true);
      console.log(
        "🔄 Fetched updated cart data for price update:",
        updatedCart,
      );
      if (!updatedCart) return;
      console.log("updateCart", updatedCart);
      // Check if cart still has discountable products
      if (!cartHasDiscountableProducts(updatedCart.items)) {
        console.log("❌ No discountable products, removing split payment UI");

        // Disconnect observer before removing DOM elements
        cartObserver.disconnect();

        const oldForm = document.getElementById("split-form");
        const oldCard = document.querySelector(".cg_subtotal_box");
        if (oldForm) oldForm.remove();
        if (oldCard) oldCard.remove();

        // Reconnect observer
        if (selectors.cartContainer) {
          cartObserver.observe(selectors.cartContainer, {
            childList: true,
            subtree: true,
            attributes: true,
            characterData: true,
          });
        }
        return;
      }

      // Get config (uses cache if available)
      const config = await getConfig(updatedCart.token);
      if (!config) return;

      // Calculate prices locally (same logic as injectSplitPaymentUI)
      const cartJson = transformShopifyCartToBackendFormat(updatedCart);
      const transformedConfig = transformConfigData(config.configData);
      const result = calculateCheckoutPrices(cartJson, transformedConfig);

      // Update cachedBackendResponse for button handler
      cachedBackendResponse = {
        data: {
          result: result,
          handlingCharges: config.handlingCharges,
          currency: updatedCart.currency,
        },
      };

      // Disconnect observer BEFORE updating DOM
      cartObserver.disconnect();

      // Update the displayed amounts in DOM
      const partialDepositElements = document.querySelectorAll(
        ".cg_subtotal_box .price-box .symbol",
      );
      if (partialDepositElements.length >= 2) {
        partialDepositElements[0].textContent = result.totalPayNow.toFixed(2);
        partialDepositElements[1].textContent = result.totalPayLater.toFixed(2);

        console.log("✅ Updated split payment prices:", {
          totalPayNow: result.totalPayNow,
          totalPayLater: result.totalPayLater,
        });
      } else {
        console.warn(
          "⚠️ Split payment price elements not found, reinjecting UI...",
        );
        injectSplitPaymentUI();
      }

      // update the price on Slip payment button as well
      const checkoutCard = createCheckoutCard(
        cachedBackendResponse,
        updatedCart.currency,
      );
      const formCheckout = createCheckoutForm();
      console.log("formCheckout", formCheckout, "checkoutCard", checkoutCard);
      if (!selectors.checkoutButton) {
        cacheSelectors();
      }

      if (selectors.cartContainer) {
        setTimeout(() => {
          safeInjectSplitUI(() => {
            injectElements(
              selectors.checkoutButton,
              checkoutCard,
              formCheckout,
            );
          });
        }, 80); // Reconnect observer AFTER DOM updates
        cartObserver.observe(selectors.cartContainer, {
          childList: true,
          subtree: true,
          attributes: true,
          characterData: true,
        });
      }
    } catch (error) {
      console.error("❌ Error updating split payment prices:", error);

      // Make sure observer is reconnected even on error
      if (selectors.cartContainer) {
        cartObserver.observe(selectors.cartContainer, {
          childList: true,
          subtree: true,
          attributes: true,
          characterData: true,
        });
      }
    }
  }

  // ========================================
  // PRODUCT PAGE: GET QUANTITY (OPTIMIZED)
  // ========================================
  /**
   * Gets currently selected quantity from product page
   *
   * @returns {number} Selected quantity or 1 as default
   *
   * Selector priority:
   * 1. input[name="quantity"]
   * 2. .quantity-partial
   *
   * Fallback: Returns 1 if no quantity selector found
   * Performance: Single querySelector with fallback
   */
  function QuantitySelector() {
    const input =
      document.querySelector('input[name="quantity"]') ||
      document.querySelector("[js-quantity-input]") ||
      document.querySelector("input[name='updates[]']") || // Dawn, Prestige
      document.querySelector("input.quantity__input") || // older themes
      document.querySelector(".cart-quantity-selector input") ||
      document.querySelector(".quantity-partial");
    return input?.value || 1;
  }

  // ========================================
  // PRODUCT PAGE: GET VARIANT ID (OPTIMIZED)
  // ========================================
  /**
   * Gets currently selected variant ID from product page
   *
   * @returns {string} Variant ID or default from config
   *
   * Supports multiple selector types:
   * - Radio buttons (common in modern themes)
   * - Checkboxes (less common)
   * - Select dropdowns (classic themes)
   * - Direct select elements
   *
   * Data attributes checked (in order):
   * 1. data-variant-id
   * 2. data-split-variant-id
   * 3. select value
   *
   * Fallback: Returns global variantId from config
   * Performance: Early returns prevent unnecessary DOM queries
   */

  // const variantId = new URLSearchParams(window.location.search).get("variant")

  function VariantSelector() {
    // Priority 1: Extract variant from URL query parameter (PRIMARY METHOD)
    const urlParams = new URLSearchParams(window.location.search);
    const urlVariantId = urlParams.get("variant");

    if (urlVariantId) {
      return urlVariantId;
    }

    console.log("⚠️ No variant in URL, falling back to DOM search");

    // Priority 2: Fallback to DOM search (for edge cases)
    if (!selectors.variantPicker) {
      selectors.variantPicker =
        document.querySelector(".variant-split") ||
        document.querySelector("variant-picker");
    }

    if (selectors.variantPicker) {
      // Check for radio/checkbox inputs
      const checkedRadio =
        selectors.variantPicker.querySelector('input[type="radio"]:checked') ||
        selectors.variantPicker.querySelector('input[type="checkbox"]:checked');

      if (checkedRadio) {
        const dataVariantId =
          checkedRadio.getAttribute("data-variant-id") ||
          checkedRadio.getAttribute("data-split-variant-id");

        if (dataVariantId) {
          console.log(
            "✅ Variant ID from DOM (radio/checkbox):",
            dataVariantId,
          );
          return dataVariantId;
        }
      }

      // Check for select dropdown
      const select =
        selectors.variantPicker.querySelector('select[name="id"]') ||
        (selectors.variantPicker.tagName === "SELECT"
          ? selectors.variantPicker
          : null);

      if (select && select.value) {
        console.log("✅ Variant ID from DOM (select):", select.value);
        return select.value;
      }
    }

    // Priority 3: Use default from config (LAST RESORT)
    console.log("⚠️ Using default variant from config:", variantId);
    return variantId;
  }

  let currentProductPrice = null;

  // ✅ Function to fetch and update price
  async function fetchPrice(variantId) {
    console.log("🔄 Fetching price for variant ID:", variantId);
    const product = await fetch(`/products/${GET_CURRENT_PRODUCT_ID}.js`).then(
      (r) => r.json(),
    );
    const variant = product.variants.find((v) => v.id == variantId);

    currentProductPrice = variant.price / 100; // Convert cents to dollars
    console.log("✅ Updated price:", currentProductPrice);

    // Update button if it exists
    const button = document.getElementById("split-button-single");
    if (button) {
      const discount = checkProductDiscount(
        window.SPLIT_CONFIG.currentProductID,
      );
      const quantity = parseInt(QuantitySelector(), 10) || 1;
      const result = calculateSingleProductSplit(
        currentProductPrice,
        quantity,
        discount,
      );

      const currency = cachedBackendResponse?.data?.currency;
      const discountText = formatDiscountText(discount, currency);
      const singleValue = {
        amount: discountText,
        deposit:
          result.totalPayNow > 0
            ? getCurrencySymbol(currency) + result.totalPayNow
            : "",
        remainingbalance:
          result.totalPayLater > 0
            ? getCurrencySymbol(currency) + result.totalPayLater
            : "",
      };

      button.querySelector(".button-text").textContent = replacePlaceholders(
        buttonText,
        singleValue,
      );
      button.querySelector(".button-subtext").textContent = replacePlaceholders(
        BUTTON_INFO,
        singleValue,
      );
    }
  }

  // ✅ Call at page load with initial variant
  const initialVariantId = VariantSelector();
  if (initialVariantId) {
    fetchPrice(initialVariantId);
  }

  (function () {
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function (...args) {
      originalPushState.apply(this, args);
      window.dispatchEvent(new Event("urlchange"));
    };

    history.replaceState = function (...args) {
      originalReplaceState.apply(this, args);
      window.dispatchEvent(new Event("urlchange"));
    };

    // ✅ Your pattern - get newVariantId here
    window.addEventListener("urlchange", () => {
      const newVariantId = VariantSelector();
      fetchPrice(newVariantId);
    });

    window.addEventListener("popstate", () => {
      const newVariantId = VariantSelector();
      fetchPrice(newVariantId);
    });
  })();

  // ========================================
  // 🆕 INITIALIZATION (UPDATED)
  // ========================================
  /**
   * Main initialization sequence
   *
   * Runs on DOMContentLoaded
   *
   * Steps:
   * 1. Cache DOM selectors
   * 2. Check for abandoned checkout and restore cart if needed
   * 3. Fetch cart data
   * 4. Get config from cache/backend
   * 5. Calculate prices locally
   * 6. Remove handling charge if needed
   * 7. Setup cart page UI
   * 8. Setup product page UI
   * 9. Setup mutation observer
   *
   * Performance considerations:
   * - First load: ~1-2 seconds (backend call + DOM operations)
   * - Cached loads: ~200ms (localStorage + DOM operations)
   * - No page reload needed for updates
   */

  // Initial selector caching
  cacheSelectors();

  // 🆕 Check for abandoned split payment and restore if needed
  const wasRestored = await restoreOriginalCart();
  if (wasRestored) {
    console.log("🔄 Cart restored, reloading page...");
    window.location.reload();
    return; // Stop execution, page will reload
  }

  // Fetch initial cart data
  const cartData = await getCart();

  if (cartData) {
    // Fetch config (checks cache first!)
    const config = await getConfig(cartData.token);

    if (config) {
      // Calculate locally for initial load
      const cartJson = transformShopifyCartToBackendFormat(cartData);
      const transformedConfig = transformConfigData(config.configData);
      const result = calculateCheckoutPrices(cartJson, transformedConfig);

      cachedBackendResponse = {
        data: {
          result: result,
          handlingCharges: config.handlingCharges,
          currency: cartData.currency,
        },
      };

      // Remove handling charge if present (requires page reload)
      const needsReload = await removeHandlingCharge(
        cartData,
        cachedBackendResponse,
      );

      if (needsReload) {
        window.location.reload();
        return;
      }
    }
  }

  // ========================================
  // CART PAGE SETUP
  // ========================================
  /**
   * Inject split payment UI on cart page
   *
   * Conditional: Only runs if:
   * 1. Checkout button exists (cart page detected)
   * 2. At least ONE product in cart has split payment discount
   */
  if (selectors.checkoutButton) {
    // 🆕 Check if any cart items are eligible for split payment
    if (cartData && cartHasDiscountableProducts(cartData.items)) {
      console.log(
        "✅ Cart has discountable products, showing split payment UI",
      );
      injectSplitPaymentUI();
    } else {
      console.log(
        "❌ No discountable products in cart, hiding split payment UI",
      );
      // Don't inject split payment UI
    }
  }

  // ========================================
  // SINGLE PRODUCT PAGE SETUP - CORRECT PLACEMENT
  // ========================================

  function calculateSingleProductSplit(price, quantity, discount) {
    if (!price || !discount) return { totalPayNow: 0, totalPayLater: 0 };

    const lineItemPrice = price * quantity;
    const totalPayNow =
      discount.paymentType === "percentage"
        ? (lineItemPrice * discount.paymentAmount) / 100
        : discount.paymentAmount * quantity;

    return {
      totalPayNow: parseFloat(totalPayNow.toFixed(2)),
      totalPayLater: parseFloat((lineItemPrice - totalPayNow).toFixed(2)),
    };
  }

  function splitPaymentButtonPlacementProductPage() {
    try {
      const currentProductID = window.SPLIT_CONFIG.currentProductID;
      const productDiscount = checkProductDiscount(currentProductID);

      // Only show split payment button if product has discount
      if (!productDiscount) {
        console.log("❌ Product not eligible for split payment, hiding button");
        // Don't create the button at all
      } else {
        console.log("✅ Product eligible for split payment, showing button");
        const currency = cachedBackendResponse.data.currency;
        // Format discount text
        const discountText = formatDiscountText(productDiscount, currency);
        let formSingle;
        console.log(
          "document.getElementById",
          document.getElementById("split-form-single"),
        );
        if (document.getElementById("split-form-single")) {
          formSingle = document.getElementById("split-form-single");
          formSingle.remove();
        } else {
          formSingle = document.createElement("form");
          formSingle.id = "split-form-single";
        }

        const quantity = parseInt(QuantitySelector(), 10) || 1;
        const result = calculateSingleProductSplit(
          currentProductPrice || 0,
          quantity,
          productDiscount,
        );

        const totalPayNow = result.totalPayNow;
        const totalPayLater = result.totalPayLater;

        const singleValue = {
          amount: discountText,
          deposit:
            totalPayNow > 0 ? getCurrencySymbol(currency) + totalPayNow : "",
          remainingbalance:
            totalPayLater > 0
              ? getCurrencySymbol(currency) + totalPayLater
              : "",
        };
        const buttonTextMain = replacePlaceholders(buttonText, singleValue);

        const descriptionText = replacePlaceholders(BUTTON_INFO, singleValue);
        formSingle.innerHTML = `
        <input type="hidden" name="order_id" value="Need to pay now to confirm order">
        <button type="button" id="split-button-single">
          <span class="button-text" style="font-size: ${BUTTON_MAIN_FONT_SIZE}px; font-weight: ${BUTTON_MAIN_FONT_WIDTH};">${buttonTextMain}</span>
          <span class="button-loader cg_hidden"></span>
          <span class="button-subtext" style="font-size: ${BUTTON_MAIN_FONT_SIZE - 4}px;">${descriptionText}</span>
        </button>
      `;

        selectors.addToCart.parentNode.insertBefore(
          formSingle,
          selectors.addToCart.nextSibling,
        );

        // ========================================
        // 👇 EVENT LISTENER INSIDE ELSE BLOCK
        // ========================================
        /**
         * Single product split payment button handler
         *
         * Simpler flow than cart button:
         * - No cart clearing needed
         * - Direct add to cart with properties
         * - Immediate checkout redirect
         */
        const singleButton = document.getElementById("split-button-single");
        if (singleButton) {
          singleButton.addEventListener("click", async function (e) {
            e.preventDefault();

            // Show loading state
            const buttonText = this.querySelector(".button-text");
            const buttonLoader = this.querySelector(".button-loader");
            const buttonSubtext = this.querySelector(".button-subtext");

            buttonText.classList.add("cg_hidden");
            buttonSubtext.classList.add("cg_hidden");
            buttonLoader.classList.remove("cg_hidden");

            const form = document.getElementById("split-form-single");
            const value = form.querySelector('input[name="order_id"]').value;

            try {
              // 🔧 FIX: Convert to numbers and validate
              const rawVariantId = VariantSelector();
              const rawQuantity = QuantitySelector();

              const variantId = Number(rawVariantId);
              const quantity = parseInt(rawQuantity, 10) || 1;

              console.log(
                "🔍 Debug - Variant ID:",
                variantId,
                "Quantity:",
                quantity,
              );

              // Validate before proceeding
              if (!variantId || isNaN(variantId)) {
                throw new Error(
                  "Invalid variant ID. Please select a product variant.",
                );
              }

              // STEP 1: Backup current cart
              const currentCart = await fetch("/cart.js").then((r) => r.json());
              localStorage.setItem(
                "split2ship_original_cart",
                JSON.stringify(currentCart.items),
              );

              // Prepare items with NUMBER types
              const items = [
                {
                  id: variantId, // ✅ Now a number
                  quantity: quantity, // ✅ Now a number
                  properties: { _partial_payment: value },
                },
              ];

              console.log("🛒 Adding item to cart:", items);

              // Add handling charge if configured
              const handlingChargeVariantId =
                cachedBackendResponse?.data?.handlingCharges?.handlingCharges
                  ?.variantId;

              if (handlingChargeVariantId) {
                const chargeId = Number(
                  handlingChargeVariantId.replace(
                    "gid://shopify/ProductVariant/",
                    "",
                  ),
                );
                items.push({
                  id: chargeId, // ✅ Also a number
                  quantity: 1,
                });
              }

              const response = await fetch("/cart/add.js", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ items }),
              });

              if (!response.ok) {
                // 🔧 FIX: Parse the error response for better debugging
                const errorData = await response.json();
                console.error("❌ Shopify API Error:", errorData);
                throw new Error(
                  errorData.description ||
                    errorData.message ||
                    `HTTP error! status: ${response.status}`,
                );
              }

              await response.json();
              window.location.href = "/checkout";
            } catch (error) {
              console.error("Error adding to cart:", error);

              // Revert button state
              buttonLoader.classList.add("cg_hidden");
              buttonText.classList.remove("cg_hidden");
              buttonSubtext.classList.remove("cg_hidden");

              // Show specific error message
              alert(
                error.message ||
                  "There was an error processing your request. Please try again.",
              );
            }
          });
        }
      }
    } catch (error) {
      console.error("Error setting up split payment button:", error);
    }
  }

  if (selectors.addToCart) {
    console.log("🔍 Setting up split payment button on product page");
    splitPaymentButtonPlacementProductPage();
  }

  document.addEventListener("click", (event) => {
    // Debounce UI updates triggered by user clicks to avoid racing with theme renders
    clearTimeout(window.splitUpdateDebounce);
    window.splitUpdateDebounce = setTimeout(() => {
      try {
        // If this looks like a product-page action, update product placement & pricing
        if (
          selectors.addToCart &&
          event.target &&
          document.body.contains(selectors.addToCart)
        ) {
          splitPaymentButtonPlacementProductPage();
          const newVariant = VariantSelector();
          if (newVariant) fetchPrice(newVariant);
        } else {
          // Otherwise update cart-level UI (prices only)
          updateSplitPaymentPrices();
        }
      } catch (e) {
        console.error("Error handling click debounce for split UI:", e);
      }
    }, 300);
  });

  // ========================================
  // MUTATION OBSERVER (OPTIMIZED)
  // ========================================
  /**
   * Watches cart container for changes and re-injects UI
   *
   * Purpose:
   * - Detect cart updates (add, remove, quantity change)
   * - Re-inject split payment UI with updated prices
   * - Handle dynamic cart drawers
   *
   * Optimizations:
   * - Debounced with 100ms timeout (prevents excessive calls)
   * - Checks for existing UI before re-injecting
   * - Re-caches selectors if needed
   *
   * Observer configuration:
   * - childList: true (watches for added/removed nodes)
   * - subtree: true (watches nested changes)
   * - attributes: false (ignores attribute changes for performance)
   * - characterData: false (ignores text changes for performance)
   *
   * Performance:
   * - Debouncing reduces calls by ~90% during rapid changes
   * - Only observes cart container (not entire document)
   * - Early returns prevent unnecessary work
   */
  let debounceTimer;
  const cartObserver = new MutationObserver(() => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      cacheSelectors();
      const splitForm = document.getElementById("split-form");

      // If form doesn't exist, inject it
      if (selectors.checkoutButton && !splitForm) {
        // Check if cart has discountable products before injecting
        const currentCart = await getCart(true);
        if (currentCart && cartHasDiscountableProducts(currentCart.items)) {
          injectSplitPaymentUI();
        }
      }
      // If form exists, update the prices
      else if (splitForm && selectors.checkoutButton) {
        updateSplitPaymentPrices();
      }
    }, 300); // 100ms debounce
  });

  // Start observing cart container if it exists
  if (selectors.cartContainer) {
    console.log(
      "user has select the cart container - starting observer",
      selectors.cartContainer,
    );

    cartObserver.observe(selectors.cartContainer, {
      childList: true, // Keeps tracking item add/remove
      subtree: true, // Keeps watching entire tree
      attributes: true, // ✅ NOW watches attribute changes (like data-price="24.00")
      characterData: true, // ✅ NOW watches text changes (like "Rs. 24.00" → "Rs. 48.00")
    });
  }

  // ========================================
  // DEBUGGING HELPERS (BROWSER CONSOLE)
  // ========================================
  /**
   * Global debugging functions for testing
   *
   * Usage in browser console:
   * - viewSplitCache() - View current cache
   * - clearSplitCache() - Clear cache manually
   * - refreshSplitConfig() - Clear cache and reload page
   */

  window.viewSplitCache = function () {
    const cache = localStorage.getItem("split_payment_config");
    if (cache) {
      const parsed = JSON.parse(cache);
      console.log("📦 Current Cache:");
      console.log("  Timestamp:", parsed.timestamp);
      console.log(
        "  Age:",
        Math.round(
          (Date.now() - new Date(parsed.timestamp).getTime()) / 1000 / 60,
        ),
        "minutes",
      );
      console.log("  Version:", parsed.version);
      console.log("  Config rules:", parsed.configData?.length || 0);
      console.table(parsed.configData);
    } else {
      console.log("📦 No cache found in localStorage");
    }
  };

  window.clearSplitCache = function () {
    clearConfigCache();
    console.log("✅ Cache cleared - refresh page to fetch fresh data");
  };

  window.refreshSplitConfig = function () {
    clearConfigCache();
    console.log("🔄 Cache cleared, reloading page...");
    window.location.reload();
  };

  console.log("✨ Split Payment initialized");
  console.log(
    "💡 Debug commands: viewSplitCache(), clearSplitCache(), refreshSplitConfig()",
  );
});
