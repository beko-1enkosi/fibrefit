from app.models import FinderRequest, Package
from app.services.recommender import recommend, required_speed


def test_required_speed_scales_for_household():
    assert required_speed(1, ["browsing"]) == 20
    assert required_speed(4, ["streaming"]) == 75
    assert required_speed(6, ["gaming"]) == 200


def test_recommendation_returns_best_match():
    packages = [
        Package(id="a", area="Midrand", network="Vuma", isp="ISP A", download_mbps=100, upload_mbps=100, price=749, contract="Monthly", reliability=90, ideal_for=["streaming"]),
        Package(id="b", area="Midrand", network="Openserve", isp="ISP B", download_mbps=50, upload_mbps=25, price=599, contract="Monthly", reliability=80, ideal_for=["browsing"]),
    ]
    request = FinderRequest(area="Midrand", budget=800, household_size=4, usage=["streaming"])
    best_match, best_value, fastest, comparison = recommend(packages, request)
    assert best_match.package.id == "a"
    assert fastest.package.id == "a"
    assert comparison is None
