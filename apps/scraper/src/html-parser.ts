import {
  AdImage,
  AdLocation,
  AdMetadata,
  AdMetrics,
  AdPrice,
  AdSeller,
  AdStatus,
  HtmlParsingResult,
  KupujemProdajemAd,
  ParsedAd,
  ParsingError,
  ParsingWarning,
} from "@repo/types";
import { CheerioAPI, load } from "cheerio";
import { readFileSync, writeFileSync } from "fs";

export class HtmlParser {
  private baseUrl: string;

  constructor(baseUrl: string = "https://www.kupujemprodajem.com") {
    this.baseUrl = baseUrl;
  }

  async parseHtmlFile(filePath: string): Promise<HtmlParsingResult> {
    const startTime = Date.now();
    const extractedAds: ParsedAd[] = [];
    const errors: ParsingError[] = [];
    const warnings: ParsingWarning[] = [];

    try {
      // Read the HTML file
      const htmlContent = readFileSync(filePath, "utf8");
      const $ = load(htmlContent);

      // Find all ad containers
      const adElements = $('section[id][class*="AdItem_adOuterHolder"]');
      console.log(`Found ${adElements.length} ad containers`);

      // Parse each ad
      adElements.each((index, element) => {
        try {
          const parsedAd = this.parseAdElement($, element);
          if (parsedAd) {
            extractedAds.push(parsedAd);
          }
        } catch (error) {
          errors.push({
            type: "EXTRACTION_FAILED",
            message: `Failed to parse ad at index ${index}: ${error}`,
            adIndex: index,
          });
        }
      });

      const endTime = Date.now();
      const stats = {
        totalAdsFound: adElements.length,
        successfullyParsed: extractedAds.length,
        failedToParse: errors.length,
        parsingTimeMs: endTime - startTime,
        htmlSizeKb: Math.round(htmlContent.length / 1024),
      };

      console.log(`Parsing completed:`);
      console.log(`  Total ads found: ${stats.totalAdsFound}`);
      console.log(`  Successfully parsed: ${stats.successfullyParsed}`);
      console.log(`  Failed to parse: ${stats.failedToParse}`);
      console.log(`  Parsing time: ${stats.parsingTimeMs}ms`);

      return {
        success: errors.length === 0,
        extractedAds,
        errors,
        warnings,
        stats,
      };
    } catch (error) {
      return {
        success: false,
        extractedAds: [],
        errors: [
          {
            type: "EXTRACTION_FAILED",
            message: `Failed to parse HTML file: ${error}`,
          },
        ],
        warnings: [],
        stats: {
          totalAdsFound: 0,
          successfullyParsed: 0,
          failedToParse: 0,
          parsingTimeMs: Date.now() - startTime,
          htmlSizeKb: 0,
        },
      };
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private parseAdElement($: CheerioAPI, element: any): ParsedAd | null {
    const $element = $(element);

    // Extract basic metadata
    const sectionId = $element.attr("id") || "";
    const scrolled = $element.attr("data-scrolled") === "true";

    // Extract title and URL
    const titleElement = $element.find(".AdItem_name__Knlo6");
    const title = titleElement.text().trim();
    const adUrlElement = $element.find('a[href*="/oglas/"]').first();
    const relativeUrl = adUrlElement.attr("href") || "";
    const url = relativeUrl.startsWith("http")
      ? relativeUrl
      : `${this.baseUrl}${relativeUrl}`;

    // Extract price
    const priceElement = $element.find(".AdItem_price__K4GWJ");
    const priceText = priceElement.text().trim();
    const price = this.parsePrice(priceText);

    // Extract location
    const locationElement = $element.find(
      ".AdItem_originAndPromoLocation__3MXPY p"
    );
    const locationText = locationElement.first().text().trim();
    const location = this.parseLocation(locationText);

    // Extract description
    const descriptionElement = $element
      .find("p")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((_: number, el: any) => {
        const text = $(el).text().trim();
        return (
          text.length > 20 && !text.includes("din") && !text.includes("pre ")
        );
      });
    const description = descriptionElement.first().text().trim();

    // Extract image
    const imageElement = $element.find("img").first();
    const images = this.parseImages($, imageElement);

    // Extract seller information
    const seller = this.parseSeller($, $element);

    // Extract metrics
    const metrics = this.parseMetrics($, $element);

    // Extract status
    const status = this.parseStatus($, $element);

    // Create metadata
    const metadata: AdMetadata = {
      sectionId,
      classes: ($element.attr("class") || "").split(" "),
      scrolled,
      category: "konzole-i-igrice",
      subcategory: "sony-playstation-igrice",
    };

    // Validate required fields
    if (!title || !price.formatted || !url) {
      return null;
    }

    const ad: KupujemProdajemAd = {
      id: sectionId,
      title,
      price,
      location,
      description,
      images,
      url,
      seller,
      metrics,
      status,
      metadata,
    };

    // Create parsed version with additional processing
    const parsedAd: ParsedAd = {
      raw: ad,
      parsed: {
        priceNumeric: price.amount,
        postedDaysAgo: this.extractDaysAgo(metrics.postedAgo),
        imageUrls: images.map((img) => img.url),
        isValidAd: true,
      },
      scrapingMetadata: {
        scrapedAt: new Date(),
        sourceUrl: url,
        parsingSuccess: true,
        parsingErrors: [],
      },
    };

    return parsedAd;
  }

  private parsePrice(priceText: string): AdPrice {
    const cleanText = priceText.replace(/\s+/g, " ").trim();
    const match = cleanText.match(/(\d+(?:\.\d+)?)\s*(din|rsd|eur|usd|\$|€)/i);

    if (match && match[1] && match[2]) {
      const amount = parseFloat(match[1]);
      const currency = match[2].toLowerCase();
      return {
        amount,
        currency: currency === "din" ? "RSD" : currency.toUpperCase(),
        formatted: cleanText,
      };
    }

    return {
      amount: 0,
      currency: "RSD",
      formatted: cleanText,
    };
  }

  private parseLocation(locationText: string): AdLocation {
    const cleanText = locationText.replace(/\s+/g, " ").trim();
    return {
      name: cleanText,
      hasDelivery: false, // Could be enhanced to detect delivery info
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private parseImages($: CheerioAPI, imageElement: any): AdImage[] {
    if (!imageElement || imageElement.length === 0) {
      return [];
    }

    const $img = $(imageElement);
    const src = $img.attr("src") || "";
    const alt = $img.attr("alt") || "";
    const width = $img.attr("width") || $img.css("width") || "";
    const height = $img.attr("height") || $img.css("height") || "";
    const loading = $img.attr("loading") as "eager" | "lazy" | undefined;

    return [
      {
        url: src,
        alt,
        width,
        height,
        loading,
      },
    ];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private parseSeller($: CheerioAPI, $element: any): AdSeller {
    const kpStoreElement = $element.find('a[href*="kpizlog.rs"]');
    const hasKpStore = kpStoreElement.length > 0;

    if (hasKpStore) {
      const storeUrl = kpStoreElement.attr("href") || "";
      const storeText = kpStoreElement.text().trim();

      return {
        name: undefined, // Name not easily extractable from this structure
        hasKpStore: true,
        storeUrl,
        storeId: storeText.replace(/[^\w-]/g, ""),
      };
    }

    return {
      hasKpStore: false,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private parseMetrics($: CheerioAPI, $element: any): AdMetrics {
    // Extract view count
    const viewElement = $element.find(".AdItem_favoriteHolder__ebvyz").first();
    const viewText = viewElement.find(".AdItem_count__twhsU").text().trim();
    const views = parseInt(viewText) || 0;

    // Extract favorite count
    const favoriteElements = $element.find(".AdItem_favoriteHolder__ebvyz");
    const favoriteText =
      favoriteElements.length > 1
        ? favoriteElements.eq(1).find(".AdItem_count__twhsU").text().trim()
        : "0";
    const favorites = parseInt(favoriteText) || 0;

    // Extract posted time
    const postedElement = $element.find(".AdItem_postedStatus__qQuya p");
    const postedAgo = postedElement.text().trim();

    return {
      views,
      favorites,
      postedAgo,
      postedDate: this.parsePostedDate(postedAgo),
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private parseStatus($: CheerioAPI, $element: any): AdStatus {
    const promotionElement = $element.find(".AdItem_promotion__G0_vk");
    const hasPromotion = promotionElement.length > 0;

    return {
      isActive: true, // Assume active if it's in the results
      isPromoted: hasPromotion,
      hasPromotion,
    };
  }

  private parsePostedDate(postedAgo: string): Date | undefined {
    const now = new Date();
    const match = postedAgo.match(
      /pre\s+(\d+)\s+(dan|dana|sat|sati|minut|minuta)/i
    );

    if (match && match[1] && match[2]) {
      const number = parseInt(match[1]);
      const unit = match[2].toLowerCase();

      if (unit.includes("dan")) {
        return new Date(now.getTime() - number * 24 * 60 * 60 * 1000);
      } else if (unit.includes("sat")) {
        return new Date(now.getTime() - number * 60 * 60 * 1000);
      } else if (unit.includes("minut")) {
        return new Date(now.getTime() - number * 60 * 1000);
      }
    }

    return undefined;
  }

  private extractDaysAgo(postedAgo: string): number {
    const match = postedAgo.match(/pre\s+(\d+)\s+dan/i);
    return match && match[1] ? parseInt(match[1]) : 0;
  }

  async saveAdsToJson(
    ads: ParsedAd[],
    outputPath: string,
    scrapingMetadata?: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      searchParams?: any;
      searchUrl?: string;
      htmlFilePaths?: string[];
      totalPages?: number;
      pageResults?: { page: number; ads: number; fileName: string }[];
      totalHtmlSize?: number;
      scrapingStartTime?: Date;
      scrapingEndTime?: Date;
    }
  ): Promise<void> {
    // Sort ads from newest to oldest based on posting date
    const sortedAds = [...ads].sort((a, b) => {
      const dateA = a.raw.metrics.postedDate || new Date(0);
      const dateB = b.raw.metrics.postedDate || new Date(0);
      return dateB.getTime() - dateA.getTime(); // Newest first
    });

    const jsonData = {
      // Basic info
      timestamp: new Date().toISOString(),
      totalAds: sortedAds.length,

      // Scraping metadata
      scrapingSession: {
        searchUrl: scrapingMetadata?.searchUrl || "unknown",
        searchParams: scrapingMetadata?.searchParams || {},
        htmlFilePaths: scrapingMetadata?.htmlFilePaths || [],
        totalPages: scrapingMetadata?.totalPages || 1,
        pageResults: scrapingMetadata?.pageResults || [],
        totalHtmlSize: scrapingMetadata?.totalHtmlSize || 0,
        scrapingStartTime:
          scrapingMetadata?.scrapingStartTime?.toISOString() ||
          new Date().toISOString(),
        scrapingEndTime:
          scrapingMetadata?.scrapingEndTime?.toISOString() ||
          new Date().toISOString(),
        scrapingDuration:
          scrapingMetadata?.scrapingStartTime &&
          scrapingMetadata?.scrapingEndTime
            ? scrapingMetadata.scrapingEndTime.getTime() -
              scrapingMetadata.scrapingStartTime.getTime()
            : 0,
        baseUrl: this.baseUrl,
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        parsingTime: new Date().toISOString(),
      },

      // Statistics
      statistics: {
        totalAdsFound: sortedAds.length,
        averagePrice:
          sortedAds.length > 0
            ? sortedAds.reduce((sum, ad) => sum + ad.raw.price.amount, 0) /
              sortedAds.length
            : 0,
        priceRange:
          sortedAds.length > 0
            ? {
                min: Math.min(...sortedAds.map((ad) => ad.raw.price.amount)),
                max: Math.max(...sortedAds.map((ad) => ad.raw.price.amount)),
              }
            : { min: 0, max: 0 },
        locationDistribution: this.getLocationDistribution(sortedAds),
        postingTimeDistribution: this.getPostingTimeDistribution(sortedAds),
        promotedAdsCount: sortedAds.filter((ad) => ad.raw.status.isPromoted)
          .length,
        adsWithKpStore: sortedAds.filter((ad) => ad.raw.seller.hasKpStore)
          .length,
        pageStatistics: {
          totalPages: scrapingMetadata?.totalPages || 1,
          adsPerPage:
            scrapingMetadata?.pageResults?.map((p) => ({
              page: p.page,
              ads: p.ads,
            })) || [],
          averageAdsPerPage:
            scrapingMetadata?.pageResults &&
            scrapingMetadata.pageResults.length > 0
              ? scrapingMetadata.pageResults.reduce(
                  (sum, p) => sum + p.ads,
                  0
                ) / scrapingMetadata.pageResults.length
              : sortedAds.length,
          pagesScraped: scrapingMetadata?.pageResults?.length || 1,
        },
        sortingInfo: {
          sortedBy: "posting_date",
          sortOrder: "newest_first",
          sortedAt: new Date().toISOString(),
        },
      },

      // Ads data (sorted)
      ads: sortedAds,
    };

    writeFileSync(outputPath, JSON.stringify(jsonData, null, 2), "utf8");
    const totalPages = scrapingMetadata?.totalPages || 1;
    console.log(
      `Saved ${sortedAds.length} ads from ${totalPages} page(s) to ${outputPath} (sorted newest to oldest)`
    );
    console.log(
      `JSON file size: ${(JSON.stringify(jsonData).length / 1024).toFixed(2)} KB`
    );
  }

  private getLocationDistribution(ads: ParsedAd[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    ads.forEach((ad) => {
      const location = ad.raw.location.name;
      distribution[location] = (distribution[location] || 0) + 1;
    });
    return distribution;
  }

  private getPostingTimeDistribution(ads: ParsedAd[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    ads.forEach((ad) => {
      const postedAgo = ad.raw.metrics.postedAgo;
      distribution[postedAgo] = (distribution[postedAgo] || 0) + 1;
    });
    return distribution;
  }
}
