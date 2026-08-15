from typing import Iterable
from app.models import Package, RankedPackage, FinderRequest


USAGE_SPEED = {
    "browsing": 20,
    "studying": 30,
    "streaming": 50,
    "remote work": 50,
    "gaming": 100,
}


def required_speed(household_size: int, usage: Iterable[str]) -> int:
    base = max([USAGE_SPEED.get(item.lower(), 20) for item in usage] or [20])
    multiplier = 1 if household_size <= 2 else 1.5 if household_size <= 4 else 2
    return int(base * multiplier)


def score_package(package: Package, request: FinderRequest) -> RankedPackage:
    score = 0.0
    reasons = []
    needed = required_speed(request.household_size, request.usage)

    # Location fit: already filtered by area, so it earns the location weight.
    score += 30

    if package.price <= request.budget:
        budget_ratio = package.price / max(request.budget, 1)
        score += 25 if budget_ratio >= 0.7 else 22
        reasons.append(f"Fits your R{request.budget} monthly budget")
    else:
        over_ratio = (package.price - request.budget) / max(request.budget, 1)
        score += max(0, 25 * (1 - over_ratio * 3))
        reasons.append(f"Costs R{package.price - request.budget} above your stated budget")

    speed_ratio = package.download_mbps / max(needed, 1)
    score += min(20, 20 * speed_ratio)
    if package.download_mbps >= needed:
        reasons.append(f"Meets the estimated {needed} Mbps need for your household")
    else:
        reasons.append(f"May be tight for an estimated {needed} Mbps household need")

    household_target = 50 if request.household_size <= 2 else 100 if request.household_size <= 4 else 200
    score += min(15, 15 * package.download_mbps / household_target)

    score += package.reliability / 10
    if package.reliability >= 85:
        reasons.append("Strong reliability score in the FibreFit demo dataset")

    return RankedPackage(
        package=package,
        match_percentage=max(0, min(100, round(score))),
        reasons=reasons[:3],
    )


def recommend(packages: list[Package], request: FinderRequest):
    area_packages = [p for p in packages if p.area.lower() == request.area.lower()]
    if not area_packages:
        raise ValueError("No demo fibre packages found for this area")

    ranked = sorted(
        [score_package(p, request) for p in area_packages],
        key=lambda item: item.match_percentage,
        reverse=True,
    )

    best_match = ranked[0]
    affordable = [r for r in ranked if r.package.price <= request.budget]
    best_value = min(
        affordable or ranked,
        key=lambda r: (r.package.price / max(r.package.download_mbps, 1), -r.match_percentage),
    )
    fastest = max(ranked, key=lambda r: r.package.download_mbps)

    comparison = None
    if request.current_speed and request.current_price:
        new = best_match.package
        comparison = {
            "current_speed": request.current_speed,
            "current_price": request.current_price,
            "recommended_speed": new.download_mbps,
            "recommended_price": new.price,
            "monthly_saving": request.current_price - new.price,
            "annual_saving": (request.current_price - new.price) * 12,
            "speed_difference": new.download_mbps - request.current_speed,
        }

    return best_match, best_value, fastest, comparison
